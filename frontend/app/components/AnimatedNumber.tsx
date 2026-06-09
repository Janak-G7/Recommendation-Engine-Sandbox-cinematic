"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  color?: string;
  fontSize?: number;
}

export default function AnimatedNumber({ value, decimals = 3, duration = 600, color = "#22D3EE", fontSize = 22 }: Props) {
  const [display, setDisplay] = useState(value);
  // BUG FIX: track current displayed value (not just the start value) so
  // mid-animation updates begin from wherever the counter currently is.
  const displayRef = useRef(value);
  const frameRef = useRef<number>();

  useEffect(() => {
    // Cancel any in-progress animation
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const start = displayRef.current;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      displayRef.current = current;
      setDisplay(parseFloat(current.toFixed(decimals)));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        displayRef.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, decimals, duration]);

  return (
    <span style={{ color, fontSize, fontWeight: 800, fontVariantNumeric: "tabular-nums", transition: "color 0.3s" }}>
      {display.toFixed(decimals)}
    </span>
  );
}
