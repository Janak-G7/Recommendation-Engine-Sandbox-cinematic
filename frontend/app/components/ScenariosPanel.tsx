"use client";
import { useState } from "react";
import { type Weights, type Scenario } from "../lib/api";

const SCENARIO_COLORS: Record<string, string> = {
  engagement_max: "#F87171",
  editorial: "#34D399",
  diversity_boost: "#E879F9",
  trending: "#F59E0B",
  balanced: "#22D3EE",
};

interface Props {
  scenarios: Scenario[];
  currentWeights: Weights;
  onLoad: (w: Weights) => void;
}

export default function ScenariosPanel({ scenarios, onLoad }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, "idle" | "loaded" | "failed">>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLoad = (s: Scenario) => {
    try {
      onLoad(s.weights);
      setActive(s.id);
      setStatus(prev => ({ ...prev, [s.id]: "loaded" }));
      showToast(`✓ "${s.title}" loaded — switched to Preference Sliders`);
    } catch {
      setStatus(prev => ({ ...prev, [s.id]: "failed" }));
      showToast(`✗ Failed to load "${s.title}"`);
    }
  };

  const handleReset = () => {
    setActive(null);
    setStatus({});
    onLoad({ w_quality: 0.5, w_popularity: 0.3, w_recency: 0.2, w_diversity: 0.2, w_engagement: 0.4 });
    showToast("↺ Reset to custom weights");
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.startsWith("✓") ? "rgba(52,211,153,0.15)" : toast.startsWith("↺") ? "rgba(34,211,238,0.15)" : "rgba(248,113,113,0.15)",
          border: `0.5px solid ${toast.startsWith("✓") ? "rgba(52,211,153,0.5)" : toast.startsWith("↺") ? "rgba(34,211,238,0.5)" : "rgba(248,113,113,0.5)"}`,
          color: toast.startsWith("✓") ? "#34D399" : toast.startsWith("↺") ? "#22D3EE" : "#F87171",
          padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          zIndex: 100, animation: "fadeIn 0.3s ease",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* Explainer */}
      <div style={{ background: "#0E1030", border: "0.5px solid #2A2D5A", borderRadius: 8, padding: "12px 16px" }}>
        <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7, margin: 0 }}>
          <span style={{ color: "#22D3EE", fontWeight: 600 }}>Real-world algorithm presets:</span> Every major platform has a different objective. TikTok optimises for watch-time. The BBC optimises for trust. Load any scenario to instantly see how those choices reshape what gets surfaced — and what gets buried. <span style={{ color: "#64748B" }}>Weights update in the Preference Sliders tab automatically.</span>
        </p>
      </div>

      {scenarios.map((s) => {
        const color = SCENARIO_COLORS[s.id] || "#22D3EE";
        const st = status[s.id] || "idle";
        const isActive = active === s.id;

        return (
          <div key={s.id} className="rr-card-hover" style={{
            background: isActive ? `rgba(${
              color === "#22D3EE" ? "56,189,248" :
              color === "#34D399" ? "52,211,153" :
              color === "#E879F9" ? "129,140,248" :
              color === "#F59E0B" ? "245,158,11" : "248,113,113"
            },0.06)` : "#0E1030",
            border: `0.5px solid ${st === "failed" ? "#F87171" : isActive ? color : "#2A2D5A"}`,
            borderRadius: 8, padding: "14px 16px", transition: "all 0.25s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{s.emoji}</span>
              <div style={{ flex: 1 }}>

                {/* Title row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{s.title}</div>
                  {st === "loaded" && (
                    <span style={{ fontSize: 9, background: `${color}20`, color, border: `0.5px solid ${color}50`, borderRadius: 3, padding: "2px 6px", fontWeight: 700, textTransform: "uppercase", animation: "fadeIn 0.3s ease" }}>
                      ✓ LOADED
                    </span>
                  )}
                  {st === "failed" && (
                    <span style={{ fontSize: 9, background: "rgba(248,113,113,0.15)", color: "#F87171", border: "0.5px solid rgba(248,113,113,0.4)", borderRadius: 3, padding: "2px 6px", fontWeight: 700, textTransform: "uppercase" }}>
                      ✗ FAILED
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 6 }}>📍 {s.platform}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.55, marginBottom: 8 }}>{s.desc}</div>
                <div style={{ fontSize: 10, color: "#F59E0B", marginBottom: 10 }}>⚠ {s.risk}</div>

                {/* Weight chips */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                  {Object.entries(s.weights).map(([k, v]) => (
                    <span key={k} style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 3,
                      background: v >= 0.7 ? `${color}15` : "rgba(255,255,255,0.03)",
                      border: `0.5px solid ${v >= 0.7 ? color + "50" : "#2A2D5A"}`,
                      color: v >= 0.7 ? color : "#64748B",
                      fontWeight: v >= 0.7 ? 700 : 400,
                    }}>
                      {k.replace("w_", "")}: {v.toFixed(1)}
                    </span>
                  ))}
                </div>

                {/* Load button */}
                <button onClick={() => handleLoad(s)} style={{
                  background: st === "failed" ? "rgba(248,113,113,0.1)" : st === "loaded" ? `${color}20` : "rgba(255,255,255,0.04)",
                  color: st === "failed" ? "#F87171" : st === "loaded" ? color : "#94A3B8",
                  border: `0.5px solid ${st === "failed" ? "rgba(248,113,113,0.5)" : st === "loaded" ? color : "#2A2D5A"}`,
                  borderRadius: 5, padding: "6px 14px", fontSize: 11,
                  fontWeight: 600, cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  transition: "all 0.15s",
                }}>
                  {st === "failed" ? "✗ Failed — Retry" : st === "loaded" ? "✓ Loaded — now in Sliders →" : "Load Scenario →"}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {active && (
        <button onClick={handleReset} style={{
          background: "transparent", color: "#64748B",
          border: "0.5px solid #2A2D5A", borderRadius: 6,
          padding: "8px 16px", fontSize: 11, fontWeight: 600,
          cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          ← Clear & Return to Custom Weights
        </button>
      )}
    </div>
  );
}
