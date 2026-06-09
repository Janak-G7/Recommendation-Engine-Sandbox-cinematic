"use client";
import { useEffect, useRef, useState } from "react";
import { type Weights, type Item } from "../lib/api";

const SIGNALS = [
  { key: "w_quality",    label: "Quality",    color: "#22D3EE", plain: "How good/accurate the content is" },
  { key: "w_popularity", label: "Popularity", color: "#E879F9", plain: "How many people clicked or viewed it" },
  { key: "w_recency",    label: "Recency",    color: "#34D399", plain: "How recently it was published" },
  { key: "w_diversity",  label: "Diversity",  color: "#F59E0B", plain: "Spread across different topics" },
  { key: "w_engagement", label: "Engagement", color: "#F87171", plain: "How long people actually read/watch it" },
] as const;

const CATS = ["All","Technology","Politics","Science","Entertainment","Finance","Health"];
const CAT_COLOR: Record<string,string> = {
  Technology:"#22D3EE", Politics:"#E879F9", Science:"#34D399",
  Entertainment:"#F59E0B", Finance:"#A78BFA", Health:"#F87171",
};
const SIG_COLORS: Record<string,string> = {
  quality:"#22D3EE", popularity:"#E879F9", recency:"#34D399",
  diversity:"#F59E0B", engagement:"#F87171",
};

function AnimatedBar({ width, color }: { width: number; color: string }) {
  return (
    <div style={{ background:"#2A2D5A", height:4, borderRadius:2, overflow:"hidden" }}>
      <div style={{ background:color, height:4, borderRadius:2, width:`${width}%`, transition:"width 0.45s cubic-bezier(0.4,0,0.2,1), background 0.3s" }} />
    </div>
  );
}

function usePreviousRanks(items: Item[]) {
  const prev = useRef<Record<string, number>>({});
  const [delta, setDelta] = useState<Record<string, number>>({});
  useEffect(() => {
    if (items.length === 0) return;
    const newDelta: Record<string, number> = {};
    items.forEach(item => {
      const oldRank = prev.current[item.id];
      if (oldRank !== undefined) newDelta[item.id] = oldRank - item.rank;
    });
    setDelta(newDelta);
    prev.current = Object.fromEntries(items.map(i => [i.id, i.rank]));
  }, [items]);
  return delta;
}

function ScoreTooltip({ item }: { item: Item }) {
  return (
    <div style={{
      position:"absolute", zIndex:50, bottom:"calc(100% + 8px)", left:0,
      background:"#0E1030", border:"0.5px solid #22D3EE",
      borderRadius:7, padding:"10px 12px", minWidth:200,
      boxShadow:"0 8px 24px rgba(0,0,0,0.5)",
      pointerEvents:"none",
    }}>
      <div style={{ fontSize:10, fontWeight:700, color:"#E2E8F0", marginBottom:8 }}>Signal Breakdown</div>
      {Object.entries(item.signal_breakdown || {}).map(([sig, val]) => (
        <div key={sig} style={{ marginBottom:6 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
            <span style={{ fontSize:10, color:"#64748B", textTransform:"capitalize" }}>{sig}</span>
            <span style={{ fontSize:10, fontWeight:700, color:SIG_COLORS[sig]||"#22D3EE" }}>{(val as number).toFixed(4)}</span>
          </div>
          <div style={{ background:"#2A2D5A", height:3, borderRadius:2 }}>
            <div style={{ background:SIG_COLORS[sig]||"#22D3EE", height:3, borderRadius:2, width:`${Math.min(((val as number)/item.composite_score)*100,100)}%` }} />
          </div>
        </div>
      ))}
      <div style={{ borderTop:"1px solid #2A2D5A", marginTop:8, paddingTop:6, display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:10, color:"#64748B" }}>Composite</span>
        <span style={{ fontSize:11, fontWeight:800, color:"#22D3EE" }}>{item.composite_score.toFixed(4)}</span>
      </div>
    </div>
  );
}

function SkeletonRow({ i }: { i: number }) {
  const [pos, setPos] = useState(200);
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const delay = i * 150;
    const duration = 1400;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start - delay + duration * 10) % duration;
      setPos(200 - (elapsed / duration) * 400);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [i]);

  return (
    <div style={{
      height: 58, marginBottom: 6, borderRadius: 6,
      background: "#0E1030",
      border: "0.5px solid #2A2D5A",
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg, transparent, rgba(34,211,238,0.04) ${pos}%, rgba(34,211,238,0.08) ${pos + 20}%, transparent ${pos + 40}%)`,
      }} />
      <div style={{ padding: "10px 13px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
          <div style={{ width: 28, height: 14, borderRadius: 3, background: "#2A2D5A" }} />
          <div style={{ width: 16, height: 8, borderRadius: 2, background: "#2A2D5A" }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ width: `${70 + (i * 7) % 25}%`, height: 10, borderRadius: 3, background: "#2A2D5A" }} />
          <div style={{ width: `${40 + (i * 11) % 20}%`, height: 8, borderRadius: 2, background: "#2A2D5A" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <div style={{ width: 40, height: 12, borderRadius: 3, background: "#2A2D5A" }} />
          <div style={{ width: 24, height: 8, borderRadius: 2, background: "#2A2D5A" }} />
        </div>
        <div style={{ width: 50 }}>
          <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#2A2D5A" }} />
        </div>
      </div>
    </div>
  );
}

interface Props {
  weights: Weights; onChange: (w: Weights) => void;
  recommendations: Item[]; loading: boolean;
  category: string; onCategoryChange: (c: string) => void;
}

export default function PreferenceSliders({ weights, onChange, recommendations, loading, category, onCategoryChange }: Props) {
  const rankDelta = usePreviousRanks(recommendations);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Explainer */}
      <div style={{ background:"#0E1030", border:"0.5px solid #2A2D5A", borderRadius:8, padding:"12px 16px" }}>
        <p style={{ fontSize:11, color:"#94A3B8", lineHeight:1.7, margin:0 }}>
          <span style={{ color:"#22D3EE", fontWeight:600 }}>How it works:</span> Every piece of content gets a score from 0–1 on five signals below. Drag the sliders to set how much each signal matters. The ranked list updates instantly — showing how a tiny weight change can completely reshuffle what people see. <span style={{ color:"#64748B" }}>Hover any item to see its signal breakdown.</span>
        </p>
      </div>

      {/* Sliders */}
      <div style={{ background:"#0E1030", border:"0.5px solid #2A2D5A", borderRadius:8, padding:"14px 16px" }}>
        <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>
          Signal Weights — drag to reshape the recommendation vector
        </div>
        {SIGNALS.map(s => (
          <div key={s.key} style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div>
                <span style={{ fontSize:12, fontWeight:600, color:"#E2E8F0" }}>{s.label}</span>
                <span style={{ fontSize:10, color:"#64748B", marginLeft:8 }}>— {s.plain}</span>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:s.color, fontVariantNumeric:"tabular-nums", minWidth:36, textAlign:"right" }}>
                {weights[s.key as keyof Weights].toFixed(2)}
              </span>
            </div>
            <input type="range" min={0} max={1} step={0.01}
              value={weights[s.key as keyof Weights]}
              onChange={e => onChange({ ...weights, [s.key]: parseFloat(e.target.value) })}
              style={{ accentColor: s.color, width:"100%" }}
            />
            <div style={{ height:2, background:"#2A2D5A", borderRadius:1, marginTop:4 }}>
              <div style={{ height:2, borderRadius:1, background:s.color, width:`${weights[s.key as keyof Weights]*100}%`, transition:"width 0.3s ease", opacity:0.6 }} />
            </div>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          <button onClick={() => onChange({ w_quality:parseFloat((Math.random()).toFixed(2)), w_popularity:parseFloat((Math.random()).toFixed(2)), w_recency:parseFloat((Math.random()).toFixed(2)), w_diversity:parseFloat((Math.random()).toFixed(2)), w_engagement:parseFloat((Math.random()).toFixed(2)) })}
            style={{ background:"rgba(34,211,238,0.1)", color:"#22D3EE", border:"0.5px solid rgba(34,211,238,0.4)", borderRadius:5, padding:"6px 14px", fontSize:11, fontWeight:600, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em" }}>
            Randomize
          </button>
          <button onClick={() => onChange({ w_quality:0.5, w_popularity:0.3, w_recency:0.2, w_diversity:0.2, w_engagement:0.4 })}
            style={{ background:"transparent", color:"#64748B", border:"0.5px solid #2A2D5A", borderRadius:5, padding:"6px 14px", fontSize:11, fontWeight:600, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em" }}>
            Reset
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {CATS.map(c => (
          <button key={c} onClick={() => onCategoryChange(c)} style={{
            fontSize:10, padding:"4px 10px", borderRadius:4, cursor:"pointer", fontWeight:500,
            background: category===c ? "rgba(34,211,238,0.1)" : "transparent",
            color: category===c ? "#22D3EE" : "#64748B",
            border: `0.5px solid ${category===c ? "rgba(34,211,238,0.4)" : "#2A2D5A"}`,
            transition:"all 0.15s",
          }}>{c}</button>
        ))}
      </div>

      {/* Results */}
      <div>
        <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
          {loading ? (
            <>
              <div style={{ width:8, height:8, borderRadius:"50%", border:"1.5px solid #2A2D5A", borderTop:"1.5px solid #22D3EE", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
              Fetching live articles...
            </>
          ) : `Ranked Results — ${recommendations.length} items`}
        </div>

        {loading && recommendations.length === 0
          ? Array.from({length:6}).map((_,i) => <SkeletonRow key={i} i={i} />)
          : recommendations.length === 0
          ? (
            <div style={{ background:"#0E1030", border:"0.5px solid #2A2D5A", borderRadius:8, padding:"32px 16px", textAlign:"center" }}>
              <div style={{ fontSize:24, marginBottom:8 }}>🔍</div>
              <div style={{ fontSize:12, fontWeight:600, color:"#E2E8F0", marginBottom:4 }}>No items found</div>
              <div style={{ fontSize:11, color:"#64748B" }}>Try selecting a different category or resetting the filters.</div>
            </div>
          )
          : recommendations.map((item, i) => {
            const d = rankDelta[item.id];
            const moved = d !== undefined && d !== 0;
            return (
              <div key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  position:"relative",
                  background:"#0E1030",
                  border:`0.5px solid ${moved ? (d > 0 ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)") : "#2A2D5A"}`,
                  borderRadius:7, padding:"10px 13px", marginBottom:6,
                  display:"flex", alignItems:"center", gap:12,
                  transition:"border-color 0.4s ease",
                  cursor:"default",
                }}>

                {hoveredId === item.id && <ScoreTooltip item={item} />}

                <div style={{ width:36, textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:800, color: i===0?"#22D3EE":i===1?"#E879F9":i===2?"#34D399":"#64748B" }}>
                    #{i+1}
                  </div>
                  {moved ? (
                    <div style={{ fontSize:9, fontWeight:700, color: d > 0 ? "#34D399" : "#F87171", lineHeight:1.2, marginTop:1 }}>
                      {d > 0 ? `↑${d}` : `↓${Math.abs(d)}`}
                    </div>
                  ) : (
                    <div style={{ fontSize:9, color:"#2A2D5A", lineHeight:1.2, marginTop:1 }}>—</div>
                  )}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#E2E8F0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.title}</div>
                  <div style={{ fontSize:10, color:"#64748B", marginTop:2 }}>
                    <span style={{ color: CAT_COLOR[item.category]||"#64748B" }}>{item.category}</span>
                    <span style={{ margin:"0 5px" }}>·</span>
                    Quality <span style={{ color:"#22D3EE" }}>{(item.quality_score*100).toFixed(0)}%</span>
                    <span style={{ margin:"0 5px" }}>·</span>
                    <span style={{ color:"#64748B", fontSize:9 }}>{item.source}</span>
                  </div>
                </div>

                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:"#22D3EE", fontVariantNumeric:"tabular-nums" }}>
                    {item.composite_score.toFixed(3)}
                  </div>
                  <div style={{ fontSize:9, color:"#64748B" }}>score</div>
                </div>

                <div style={{ width:50, flexShrink:0 }}>
                  <AnimatedBar
                    key={item.id}
                    width={item.composite_score * 100}
                    color={i===0?"#22D3EE":i<=2?"#E879F9":"#64748B"}
                  />
                </div>
              </div>
            );
          })
        }
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
