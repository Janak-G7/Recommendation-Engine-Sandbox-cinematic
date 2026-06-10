"use client";
import { useState, useEffect } from "react";
import { useRecommendations } from "./hooks/useRecommendations";
import PreferenceSliders from "./components/PreferenceSliders";
import ScoreView from "./components/ScoreView";
import BiasLoop from "./components/BiasLoop";
import OutcomesPanel from "./components/OutcomesPanel";
import ScenariosPanel from "./components/ScenariosPanel";
import Sidebar from "./components/Sidebar";
import { type Weights } from "./lib/api";

const TABS = [
  { id: "pref",      label: "Preference Sliders",   desc: "Drag weights, watch rankings change",   accent: "#22D3EE", icon: "🎚" },
  { id: "score",     label: "Model Score View",      desc: "See inside each item's score",          accent: "#E879F9", icon: "🧮" },
  { id: "bias",      label: "Bias Feedback Loop",    desc: "Click to trigger popularity bias",      accent: "#F87171", icon: "🔁" },
  { id: "outcomes",  label: "Content Outcomes",      desc: "Quality vs actual exposure",            accent: "#34D399", icon: "📊" },
  { id: "scenarios", label: "Reset Scenarios",       desc: "Load real-world algorithm presets",     accent: "#F59E0B", icon: "⚡" },
];

const ARCHITECT = {
  name: "janak.g",
  batch: "Batch 2 Interns",
  stack: "Next.js, FastAPI, Tailwind CSS, ECharts / D3 / Plotly",
};

export default function Home() {
  const [dataMode, setDataMode] = useState<"synthetic" | "live">("synthetic");
  const rr = useRecommendations(dataMode);
  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [hintShown, setHintShown] = useState(true);

  const handleScenarioLoad = (w: Weights) => {
    rr.loadScenario(w);
    setToast("✓ Scenario loaded — viewing in Preference Sliders");
    setHintShown(false);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const t = setTimeout(() => setHintShown(false), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPanelOpen(false); setInfoOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{
      background: "#07081C", minHeight: "100vh",
      display: "flex", flexDirection: "column",
      fontFamily: "Inter, system-ui, sans-serif", color: "#E2E8F0",
      position: "relative",
    }}>

      {/* Ambient film vignette */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,211,238,0.05) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 50%, rgba(232,121,249,0.04) 0%, transparent 70%)",
      }} />

      {/* ── Cinematic Header ───────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 30, height: 52,
        background: "linear-gradient(180deg, rgba(7,8,28,0.92) 0%, rgba(7,8,28,0.7) 70%, rgba(7,8,28,0.3) 100%)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        pointerEvents: "none",
      }}>
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(34,211,238,0.025) 0px, rgba(34,211,238,0.025) 1px, transparent 1px, transparent 3px)",
          pointerEvents: "none",
        }} />
        <div aria-hidden style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
          background: "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.4) 20%, rgba(232,121,249,0.4) 50%, rgba(34,211,238,0.4) 80%, transparent 100%)",
          boxShadow: "0 0 8px rgba(34,211,238,0.3)",
        }} />

        <div style={{ position: "relative", height: "100%", padding: "0 22px", display: "flex", alignItems: "center", gap: 14, pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#22D3EE",
              boxShadow: "0 0 10px #22D3EE, 0 0 20px rgba(34,211,238,0.5)",
              animation: "pulse 2s infinite",
            }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", color: "#64748B", textTransform: "uppercase" }}>REAL RAILS</span>
            <span style={{ color: "#2A2D5A", fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "#E2E8F0" }}>
              Recommendation Engine Sandbox
            </span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", background: "rgba(20,22,60,0.6)", border: "0.5px solid #2A2D5A", borderRadius: 5, overflow: "hidden" }}>
              {(["synthetic", "live"] as const).map(mode => (
                <button key={mode} onClick={() => setDataMode(mode)} style={{
                  padding: "4px 11px", fontSize: 9, fontWeight: 700, cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: "0.1em", border: "none",
                  background: dataMode === mode ? (mode === "live" ? "rgba(52,211,153,0.15)" : "rgba(34,211,238,0.12)") : "transparent",
                  color: dataMode === mode ? (mode === "live" ? "#34D399" : "#22D3EE") : "#64748B",
                  transition: "all 0.15s",
                }}>{mode}</button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: dataMode === "live" ? (rr.gdeltReady ? "#34D399" : "#F59E0B") : "#22D3EE",
                boxShadow: `0 0 6px ${dataMode === "live" ? (rr.gdeltReady ? "#34D399" : "#F59E0B") : "#22D3EE"}`,
                animation: "pulse 1.5s infinite",
              }} />
              <span style={{ fontSize: 9, color: "#64748B", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {dataMode === "live" ? (rr.gdeltReady ? "Live Feed" : "Connecting…") : "Synthetic"}
              </span>
            </div>

            <div style={{ width: 1, height: 18, background: "#2A2D5A" }} />

            <button onClick={() => setInfoOpen(true)} aria-label="Architect info" style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "rgba(20,22,60,0.7)", color: "#94A3B8",
              border: "0.5px solid #2A2D5A", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontStyle: "italic", fontWeight: 700, fontFamily: "Georgia, serif",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "#22D3EE";
              e.currentTarget.style.borderColor = "rgba(34,211,238,0.5)";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(34,211,238,0.25)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "#94A3B8";
              e.currentTarget.style.borderColor = "#2A2D5A";
              e.currentTarget.style.boxShadow = "none";
            }}
            >i</button>
          </div>
        </div>
      </div>

      {/* ── 100% Full Stage ────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", paddingTop: 52, position: "relative", zIndex: 2 }}>

        {/* ── Centered Hero ──────────────────────────────────────── */}
        <div style={{ textAlign: "center", padding: "30px 24px 20px", flexShrink: 0, position: "relative" }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.32em",
            color: "#5B6B9E", textTransform: "uppercase", marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <span style={{ width: 22, height: 1, background: "linear-gradient(90deg, transparent, #22D3EE)" }} />
            Distribution &amp; Demand Rail
            <span style={{ width: 22, height: 1, background: "linear-gradient(90deg, #E879F9, transparent)" }} />
          </div>

          <h1 data-testid="hero-title" style={{
            margin: 0, fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.05,
            background: "linear-gradient(100deg, #FFFFFF 0%, #BFE9F5 38%, #22D3EE 62%, #E879F9 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Recommendation Engine Sandbox
          </h1>

          <p style={{
            margin: "12px auto 0", maxWidth: 560, fontSize: 13, lineHeight: 1.6,
            color: "#8499AE", fontWeight: 400,
          }}>
            Tune the signals behind what gets seen — and watch quality, popularity, and bias fight for the top spot.
          </p>

          <div aria-hidden style={{
            margin: "22px auto 0", width: 120, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.5), rgba(232,121,249,0.5), transparent)",
          }} />

          {/* Live stat strip — no need to open the panel */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
            {[
              { label: "Avg Quality", value: rr.avgQuality ? (rr.avgQuality * 100).toFixed(0) + "%" : "—", accent: "#22D3EE" },
              { label: "Avg Score",   value: rr.avgScore ? rr.avgScore.toFixed(3) : "—",                   accent: "#E879F9" },
              { label: "Top Category", value: rr.topCategory || "—",                                       accent: "#34D399" },
            ].map(s => (
              <div key={s.label} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                minWidth: 120, padding: "10px 18px",
                background: "rgba(10,10,38,0.5)", border: "1px solid #2A2D5A", borderRadius: 12,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#5B6B9E", textTransform: "uppercase" }}>{s.label}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: s.accent, fontVariantNumeric: "tabular-nums", textShadow: `0 0 16px ${s.accent}40` }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Centered Segmented Tabs ────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", flexShrink: 0, padding: "0 16px 18px" }}>
          <div style={{
            display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: 5, padding: 6,
            background: "rgba(10,10,38,0.55)", border: "1px solid #2A2D5A", borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}>
            {TABS.map((t) => {
              const active = rr.tab === t.id;
              return (
                <button key={t.id} onClick={() => rr.setTab(t.id)} className="rr-tab" style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  color: active ? "#070A1A" : "#8499AE",
                  background: active ? t.accent : "transparent",
                  border: `1px solid ${active ? t.accent : "transparent"}`,
                  borderRadius: 11,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  whiteSpace: "nowrap", transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
                  boxShadow: active ? `0 4px 16px ${t.accent}55, 0 0 24px ${t.accent}33` : "none",
                  ["--tab-accent" as any]: t.accent,
                }} title={t.desc}>
                  <span style={{ fontSize: 13, filter: active ? "none" : "grayscale(0.4) opacity(0.7)" }}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div key={rr.tab} style={{ padding: "4px 20px 80px", maxWidth: 1040, width: "100%", margin: "0 auto", animation: "fadeIn .6s ease both" }}>
          {rr.isLive && !rr.gdeltReady && (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", marginBottom: 16,
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 10,
            }}>
              <div style={{
                width: 14, height: 14, flexShrink: 0, borderRadius: "50%",
                border: "2px solid rgba(245,158,11,0.25)", borderTopColor: "#F59E0B",
                animation: "spin 0.8s linear infinite",
              }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>Connecting to live GDELT feed…</div>
                <div style={{ fontSize: 11, color: "#8499AE", marginTop: 2 }}>
                  Showing synthetic data meanwhile. Live articles will swap in automatically (GDELT can take 30–60s and may rate-limit).
                </div>
              </div>
            </div>
          )}
          {rr.tab === "pref" && (
            <PreferenceSliders
              weights={rr.weights}
              onChange={rr.setWeights}
              recommendations={rr.recommendations}
              loading={rr.loading}
              category={rr.category}
              onCategoryChange={rr.setCategory}
            />
          )}
          {rr.tab === "score" && (
            (rr.isLive ? rr.recommendations : rr.allItems).length > 0
              ? <ScoreView items={rr.isLive ? rr.recommendations : rr.allItems} />
              : <div style={{ background:"#0C1824", border:"0.5px solid #2A2D5A", borderRadius:8, padding:"32px 16px", textAlign:"center" }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>🔍</div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#E2E8F0", marginBottom:4 }}>No items to score</div>
                  <div style={{ fontSize:11, color:"#64748B" }}>Adjust the filter or reset to All.</div>
                </div>
          )}
          {rr.tab === "bias" && (
            <BiasLoop
              items={rr.isLive ? rr.recommendations.map((item, i) => ({
                id: item.id, title: item.title, category: item.category,
                composite_score: item.composite_score,
                boosted_popularity: item.base_popularity,
                rank: i + 1, click_boost: 0,
                click_count: rr.clicks.filter(c => c === item.id).length,
              })) : rr.feedbackItems}
              clicks={rr.clicks}
              popularityGap={rr.popularityGap}
              gini={rr.gini}
              totalClicks={rr.totalClicks}
              onItemClick={rr.handleClick}
              onReset={rr.resetClicks}
            />
          )}
          {rr.tab === "scenarios" && (
            <ScenariosPanel scenarios={rr.scenarios} currentWeights={rr.weights} onLoad={handleScenarioLoad} />
          )}
          {rr.tab === "outcomes" && (
            <OutcomesPanel outcomes={rr.isLive ? (() => {
              const items = rr.recommendations;
              if (!items.length) return null;
              const total = items.reduce((s, _, i) => s + 1 / (i + 1), 0);
              const catExp: Record<string, number> = {}, catQ: Record<string, number> = {};
              items.forEach((item, i) => {
                const exp = parseFloat(((1 / (i + 1)) / total * 100).toFixed(2));
                catExp[item.category] = parseFloat(((catExp[item.category] || 0) + exp).toFixed(2));
                catQ[item.category] = item.quality_score;
              });
              const scores = items.map(i => i.quality_score);
              const exposures = items.map((_, i) => parseFloat(((1 / (i + 1)) / total * 100).toFixed(2)));
              const meanQ = scores.reduce((a, b) => a + b, 0) / scores.length;
              const meanE = exposures.reduce((a, b) => a + b, 0) / exposures.length;
              const corr = scores.reduce((s, q, i) => s + (q - meanQ) * (exposures[i] - meanE), 0) /
                Math.sqrt(scores.reduce((s, q) => s + (q - meanQ) ** 2, 0) * exposures.reduce((s, e) => s + (e - meanE) ** 2, 0) + 1e-9);
              return {
                scatter: items.map((item, i) => ({ ...item, exposure: exposures[i] })),
                category_exposure: catExp, category_quality: catQ,
                quality_exposure_correlation: parseFloat(corr.toFixed(3)),
              };
            })() : rr.outcomes} />
          )}
        </div>
      </div>

      {/* ── Edge Handle (panel trigger) ─────────────────────────── */}
      {!panelOpen && (
        <button onClick={() => { setPanelOpen(true); setHintShown(false); }} aria-label="Open Intelligence Panel" style={{
          position: "fixed", top: "50%", right: 0, transform: "translateY(-50%)", zIndex: 25,
          width: 26, height: 110,
          background: "linear-gradient(180deg, rgba(20,22,60,0.4) 0%, rgba(34,211,238,0.12) 50%, rgba(20,22,60,0.4) 100%)",
          border: "0.5px solid rgba(34,211,238,0.3)", borderRight: "none",
          borderRadius: "8px 0 0 8px", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          boxShadow: "-2px 0 12px rgba(34,211,238,0.08)",
          transition: "all 0.25s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.width = "32px";
          e.currentTarget.style.background = "linear-gradient(180deg, rgba(20,22,60,0.6) 0%, rgba(34,211,238,0.25) 50%, rgba(20,22,60,0.6) 100%)";
          e.currentTarget.style.boxShadow = "-4px 0 20px rgba(34,211,238,0.2)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.width = "26px";
          e.currentTarget.style.background = "linear-gradient(180deg, rgba(20,22,60,0.4) 0%, rgba(34,211,238,0.12) 50%, rgba(20,22,60,0.4) 100%)";
          e.currentTarget.style.boxShadow = "-2px 0 12px rgba(34,211,238,0.08)";
        }}
        >
          <span style={{ color: "#22D3EE", fontSize: 14, lineHeight: 1 }}>‹</span>
          <span style={{
            writingMode: "vertical-rl", transform: "rotate(180deg)",
            color: "#22D3EE", fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase",
          }}>Intel</span>
        </button>
      )}

      {/* ── Slide-over Panel ───────────────────────────────────── */}
      {panelOpen && (
        <div onClick={() => setPanelOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
          animation: "backdropFadeIn 0.25s ease both",
        }} />
      )}

      <div data-testid="intel-panel" data-open={panelOpen} style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(420px, 90vw)", zIndex: 50,
        background: "#0E1030",
        borderLeft: "0.5px solid rgba(34,211,238,0.25)",
        boxShadow: panelOpen ? "-12px 0 50px rgba(0,0,0,0.6), inset 1px 0 0 rgba(34,211,238,0.1)" : "none",
        transform: panelOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.4s cubic-bezier(0.32,0.72,0.18,1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div aria-hidden style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: 1,
          background: "linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.5) 50%, transparent 100%)",
          pointerEvents: "none",
        }} />

        <button onClick={() => setPanelOpen(false)} aria-label="Close panel" style={{
          position: "absolute", top: 12, right: 12, zIndex: 60,
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(7,8,28,0.9)", color: "#94A3B8",
          border: "0.5px solid #2A2D5A", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, lineHeight: 1, transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#F87171"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.borderColor = "#2A2D5A"; }}
        >✕</button>

        <Sidebar
          avgScore={rr.avgScore}
          avgQuality={rr.avgQuality}
          topCategory={rr.topCategory}
          category={rr.category}
          onCategoryChange={rr.setCategory}
          weights={rr.weights}
          totalItems={rr.recommendations.length}
        />
      </div>

      {/* ── (i) Architect Modal ────────────────────────────────── */}
      {infoOpen && (
        <>
          <div onClick={() => setInfoOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 70,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            animation: "backdropFadeIn 0.25s ease both",
          }} />
          <div role="dialog" aria-modal="true" style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)", zIndex: 80,
            width: "min(380px, 90vw)",
            background: "#14163C",
            border: "0.5px solid rgba(34,211,238,0.3)",
            borderRadius: 10, padding: "22px 24px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(34,211,238,0.1), 0 0 80px rgba(34,211,238,0.08)",
            animation: "fadeIn 0.25s ease both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>
                  Cinematic Rail · Architect Signature
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>Build Metadata</div>
              </div>
              <button onClick={() => setInfoOpen(false)} aria-label="Close" style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "transparent", color: "#64748B",
                border: "0.5px solid #2A2D5A", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, lineHeight: 1,
              }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Architect", value: ARCHITECT.name, color: "#22D3EE" },
                { label: "Batch",     value: ARCHITECT.batch, color: "#E879F9" },
                { label: "Stack",     value: ARCHITECT.stack, color: "#34D399" },
              ].map(row => (
                <div key={row.label} data-testid={`meta-${row.label.toLowerCase()}`} style={{
                  padding: "10px 12px",
                  background: "rgba(7,8,28,0.5)",
                  border: "0.5px solid #2A2D5A",
                  borderRadius: 6,
                }}>
                  <div style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: 12, color: row.color, fontWeight: 600, lineHeight: 1.5 }}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "0.5px solid #2A2D5A", fontSize: 10, color: "#64748B", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Real Rails Intelligence Library · PoC #49
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes skeletonShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes backdropFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "rgba(52,211,153,0.15)",
          border: "0.5px solid rgba(52,211,153,0.5)",
          color: "#34D399",
          padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          zIndex: 100, animation: "fadeIn 0.3s ease",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
