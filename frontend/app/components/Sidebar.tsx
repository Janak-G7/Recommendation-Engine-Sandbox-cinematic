"use client";
import { type Weights, downloadSample } from "../lib/api";
import AnimatedNumber from "./AnimatedNumber";

const CATEGORIES = ["All", "Technology", "Politics", "Science", "Entertainment", "Finance", "Health"];
const CAT_COLOR: Record<string, string> = {
  Technology: "#22D3EE", Politics: "#E879F9", Science: "#34D399",
  Entertainment: "#F59E0B", Finance: "#A78BFA", Health: "#F87171",
};

interface Props {
  avgScore: number;
  avgQuality: number;
  topCategory: string;
  category: string;
  onCategoryChange: (c: string) => void;
  weights: Weights;
  totalItems: number;
}

function StatPill({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#07081C", border: "0.5px solid #2A2D5A", borderRadius: 6, padding: "8px 12px", flex: 1 }}>
      <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function Sidebar({ avgScore, avgQuality, topCategory, category, onCategoryChange, weights, totalItems }: Props) {
  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      overflowY: "auto", background: "#0E1030",
    }}>

      {/* Panel header (offset for close button) */}
      <div style={{ padding: "14px 50px 6px 16px" }}>
        <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Intelligence Panel
        </div>
      </div>

      {/* Section A — Metric */}
      <div style={{ padding: "10px 16px 14px", borderBottom: "1px solid #2A2D5A" }}>
        <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Section A — Live Intelligence
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#22D3EE", letterSpacing: "-0.02em", marginBottom: 2 }}>
          Recommendation Engine Sandbox
        </div>
        <div style={{ fontSize: 10, color: "#64748B", marginBottom: 10 }}>
          Distribution & Demand Rail
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <StatPill label="Avg Score">
            <AnimatedNumber value={avgScore} decimals={3} color="#22D3EE" fontSize={17} />
          </StatPill>
          <StatPill label="Avg Quality">
            <AnimatedNumber value={avgQuality * 100} decimals={0} color="#34D399" fontSize={17} />
          </StatPill>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <StatPill label="Top Category">
            <div style={{ fontSize: 14, fontWeight: 800, color: "#E879F9" }}>{topCategory || "—"}</div>
          </StatPill>
          <StatPill label="Items">
            <AnimatedNumber value={totalItems} decimals={0} color="#F59E0B" fontSize={17} />
          </StatPill>
        </div>
      </div>

      {/* Section B — Why This Matters */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #2A2D5A" }}>
        <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Section B — Why This Matters
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7 }}>
          Recommendation algorithms decide what <strong style={{ color: "#E2E8F0" }}>3.5 billion people</strong> read, watch, and believe every day. Yet the ranking logic is completely invisible to everyone except the engineers who write it.
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7, marginTop: 8 }}>
          This sandbox makes those signals <span style={{ color: "#22D3EE" }}>inspectable and touchable</span> — turning abstract algorithm talk into something everyday viewers, builders, and allocators can actually understand and challenge.
        </div>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {[["Content Ranking", "#22D3EE"], ["Feedback Loops", "#E879F9"], ["Popularity Bias", "#F59E0B"], ["Demand Signals", "#34D399"]].map(([label, color]) => (
            <span key={label} style={{
              fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 3,
              border: `0.5px solid ${color}40`, background: `${color}10`,
              color: color as string, textTransform: "uppercase", letterSpacing: "0.06em",
            }}>{label}</span>
          ))}
        </div>
      </div>

      {/* Section C — Who Controls */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #2A2D5A" }}>
        <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Section C — Who Controls the Rail
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7, marginBottom: 10 }}>
          A handful of engineers at <span style={{ color: "#E879F9" }}>YouTube, TikTok, Netflix, Spotify, and Meta</span> set the objective functions that govern what content surfaces globally. Creators, journalists, and audiences have <strong style={{ color: "#F87171" }}>zero visibility</strong> into these functions — or recourse when they change.
        </div>
        <div style={{ background: "#07081C", border: "0.5px solid #2A2D5A", borderRadius: 7, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Data Sources
          </div>
          {[
            { icon: "📡", name: "GDELT", note: "Event-level content signals", tag: "mock", tagColor: "#E879F9" },
            { icon: "🌍", name: "Our World in Data", note: "Consumption baselines", tag: "mock", tagColor: "#E879F9" },
            { icon: "🧪", name: "Synthetic Matrix", note: "100 users × 24 items", tag: "generated", tagColor: "#34D399" },
          ].map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 13 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: "#E2E8F0" }}>{s.name}</span>
                <span style={{ fontSize: 9, color: "#64748B", marginLeft: 6 }}>{s.note}</span>
              </div>
              <span style={{ fontSize: 8, color: s.tagColor, border: `0.5px solid ${s.tagColor}40`, padding: "1px 5px", borderRadius: 2, textTransform: "uppercase", fontWeight: 600 }}>{s.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section D — Filters */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #2A2D5A" }}>
        <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Section D — Filters
        </div>
        <div style={{ fontSize: 10, color: "#64748B", marginBottom: 8 }}>Filter by Category</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => onCategoryChange(c)} style={{
              fontSize: 10, padding: "4px 9px", borderRadius: 4, cursor: "pointer", fontWeight: 500,
              background: category === c ? `${CAT_COLOR[c] || "#22D3EE"}15` : "transparent",
              color: category === c ? (CAT_COLOR[c] || "#22D3EE") : "#64748B",
              border: `0.5px solid ${category === c ? (CAT_COLOR[c] || "#22D3EE") + "50" : "#2A2D5A"}`,
              transition: "all 0.15s",
            }}>{c}</button>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: "8px 10px", background: "#07081C", border: "0.5px solid #2A2D5A", borderRadius: 6, fontSize: 10, color: "#64748B", lineHeight: 1.6 }}>
          💡 <span style={{ color: "#22D3EE" }}>Tip:</span> Load a scenario from the last tab, then come back here to see how the category distribution shifts.
        </div>
      </div>

      {/* Section E — Download */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Section E — Export
        </div>
        <button onClick={() => downloadSample(weights)} style={{
          width: "100%", background: "rgba(34,211,238,0.07)", color: "#22D3EE",
          border: "0.5px solid rgba(34,211,238,0.35)", borderRadius: 7,
          padding: "10px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer",
          textTransform: "uppercase", letterSpacing: "0.05em", transition: "background 0.15s",
        }}>
          ↓ Download Sample Data (CSV)
        </button>
        <div style={{ marginTop: 8, fontSize: 10, color: "#64748B", lineHeight: 1.6 }}>
          Exports all 24 items with quality, popularity, composite scores, ranks, and source labels. Use it to build your own model.
        </div>
      </div>
    </div>
  );
}
