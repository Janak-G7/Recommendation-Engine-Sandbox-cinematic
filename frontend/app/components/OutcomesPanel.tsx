"use client";
import dynamic from "next/dynamic";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const CAT_COLOR: Record<string,string> = {
  Technology:"#22D3EE", Politics:"#E879F9", Science:"#34D399",
  Entertainment:"#F59E0B", Finance:"#A78BFA", Health:"#F87171",
};

interface Props {
  outcomes: {
    scatter: Array<{ id:string; title:string; category:string; quality_score:number; exposure:number; rank:number }>;
    category_exposure: Record<string,number>;
    category_quality: Record<string,number>;
    quality_exposure_correlation: number;
  } | null;
}

export default function OutcomesPanel({ outcomes }: Props) {
  if (!outcomes) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {[200,160].map((h,i) => <div key={i} className="skeleton" style={{ height:h, borderRadius:8 }} />)}
    </div>
  );

  const corr = outcomes.quality_exposure_correlation;
  const corrColor = corr > 0.5 ? "#34D399" : corr > 0.2 ? "#F59E0B" : "#F87171";
  const corrLabel = corr > 0.5 ? "Strong — quality IS rewarded" : corr > 0.2 ? "Weak — quality partly matters" : "None — quality is irrelevant";

  // Normalize scatter exposure so it matches the category bar chart percentages
  const totalScatterExposure = outcomes.scatter.reduce((s, i) => s + i.exposure, 0) || 1;

  // Plotly scatter traces per category
  const cats = Object.keys(CAT_COLOR);
  const plotlyTraces = cats.map(cat => {
    const catItems = outcomes.scatter.filter(i => i.category === cat);
    return {
      type: "scatter" as const,
      mode: "markers" as const,
      name: cat,
      x: catItems.map(i => parseFloat((i.quality_score * 100).toFixed(1))),
      y: catItems.map(i => parseFloat(((i.exposure / totalScatterExposure) * 100).toFixed(2))),
      text: catItems.map(i => i.title),
      hovertemplate: "<b>%{text}</b><br>Quality: %{x}%<br>Exposure: %{y}%<extra></extra>",
      marker: { color: CAT_COLOR[cat], size: 10, opacity: 0.85 },
    };
  });

  const plotlyLayout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#64748B", size: 10 },
    margin: { t: 20, b: 50, l: 50, r: 20 },
    xaxis: {
      title: { text: "Quality Score %", font: { color: "#64748B", size: 10 } },
      tickformat: ".0f",
      ticksuffix: "%",
      gridcolor: "#2A2D5A",
      linecolor: "#2A2D5A",
      color: "#64748B",
    },
    yaxis: {
      title: { text: "Exposure %", font: { color: "#64748B", size: 10 } },
      tickformat: ".1f",
      ticksuffix: "%",
      gridcolor: "#2A2D5A",
      color: "#64748B",
    },
    legend: { font: { color: "#64748B", size: 9 }, bgcolor: "transparent" },
    hoverlabel: {
      bgcolor: "#0E1030", bordercolor: "#22D3EE",
      font: { color: "#E2E8F0", size: 11 },
    },
  };

  // BUG FIX: exposure values are raw sums, not percentages. Normalize them
  // to real share-of-total so the % labels are accurate.
  const rawExposureEntries = Object.entries(outcomes.category_exposure);
  const totalExposure = rawExposureEntries.reduce((s, [, v]) => s + (v as number), 0) || 1;
  const normalizedExposure: Record<string, number> = Object.fromEntries(
    rawExposureEntries.map(([k, v]) => [k, ((v as number) / totalExposure) * 100])
  );

  const catData = Object.entries(normalizedExposure).sort(([,a],[,b]) => b-a);
  const catOption = {
    backgroundColor:"transparent",
    grid:{ top:8, bottom:8, left:110, right:50 },
    xAxis:{ type:"value", axisLabel:{ color:"#64748B", fontSize:9, formatter:(v:number)=>`${v.toFixed(1)}%` }, splitLine:{ lineStyle:{ color:"#2A2D5A" } } },
    yAxis:{ type:"category", data:catData.map(([k])=>k), axisLabel:{ color:"#64748B", fontSize:11 }, axisLine:{ lineStyle:{ color:"#2A2D5A" } } },
    tooltip:{ backgroundColor:"#0E1030", borderColor:"#2A2D5A", textStyle:{ color:"#E2E8F0", fontSize:11 }, formatter:(p:any)=>`${p.name}: <span style="color:#22D3EE;font-weight:700">${p.value.toFixed(1)}%</span>` },
    series:[{ type:"bar", barMaxWidth:20,
      data: catData.map(([cat,val]) => ({ value:parseFloat(val.toFixed(1)), itemStyle:{ color:CAT_COLOR[cat]||"#22D3EE", borderRadius:[0,3,3,0], opacity:0.85 } })),
      label:{ show:true, position:"right", color:"#64748B", fontSize:9, formatter:(p:any)=>`${p.value.toFixed(1)}%` },
    }],
  };

  const sorted = catData; // already sorted by normalized exposure
  if (sorted.length === 0) {
    return (
      <div style={{ background:"#0C1824", border:"0.5px solid #2A2D5A", borderRadius:8, padding:"32px 16px", textAlign:"center" }}>
        <div style={{ fontSize:24, marginBottom:8 }}>📊</div>
        <div style={{ fontSize:12, fontWeight:600, color:"#E2E8F0", marginBottom:4 }}>No category data for this view</div>
        <div style={{ fontSize:11, color:"#64748B" }}>Try a different filter or reset to All.</div>
      </div>
    );
  }
  const top = sorted[0];
  const bottom = sorted[sorted.length-1];
  const topQ = ((outcomes.category_quality[top[0]] || 0) * 100).toFixed(0);
  const bottomQ = ((outcomes.category_quality[bottom[0]] || 0) * 100).toFixed(0);
  const ratio = bottom[1] ? ((top[1] as number) / (bottom[1] as number)).toFixed(1) : "?";

  return (
    <div className="flex flex-col gap-4">

      {/* Explainer */}
      <Card style={{ background:"#0E1030", border:"0.5px solid #2A2D5A" }}>
        <CardContent style={{ padding:"12px 16px" }}>
          <p style={{ fontSize:11, color:"#94A3B8", lineHeight:1.7, margin:0 }}>
            <span style={{ color:"#22D3EE", fontWeight:600 }}>The real question:</span> Does the algorithm surface the <em>best</em> content, or just the most popular? Each dot is one piece of content. If quality predicted exposure, dots would rise from bottom-left to top-right. If it's flat — quality doesn't matter.
          </p>
        </CardContent>
      </Card>

      {/* Correlation stat */}
      <Card style={{ background:"#0E1030", border:`0.5px solid ${corrColor}30` }}>
        <CardContent style={{ padding:"14px 16px", display:"grid", gridTemplateColumns:"auto 1fr", gap:20 }}>
          <div>
            <div style={{ fontSize:9, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Quality–Exposure Correlation</div>
            <div style={{ fontSize:32, fontWeight:800, color:corrColor }} className="num-transition">{corr.toFixed(2)}</div>
            <div style={{ fontSize:11, color:corrColor, marginTop:2 }}>{corrLabel}</div>
          </div>
          <div style={{ borderLeft:"1px solid #2A2D5A", paddingLeft:20 }}>
            <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>What to do</div>
            <div style={{ fontSize:11, color:"#94A3B8", lineHeight:1.6 }}>
              A correlation near <span style={{ color:"#F87171" }}>0</span> means bad content gets as much airtime as good content. Go back to <span style={{ color:"#22D3EE" }}>Preference Sliders</span> and raise the <strong style={{ color:"#22D3EE" }}>Quality weight</strong> to force better content to the top.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plain English Insight */}
      <Card style={{ background:"#0E1030", border:"0.5px solid rgba(34,211,238,0.2)" }}>
        <CardContent style={{ padding:"12px 16px" }}>
          <div style={{ fontSize:9, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Plain English Summary</div>
          <div style={{ fontSize:11, color:"#94A3B8", lineHeight:1.7 }}>
            <span style={{ color: CAT_COLOR[top[0]] || "#F59E0B", fontWeight:600 }}>{top[0]}</span> content gets the most exposure ({(top[1] as number).toFixed(1)}%) with a quality score of <span style={{ color:"#22D3EE" }}>{topQ}%</span>.{" "}
            <span style={{ color: CAT_COLOR[bottom[0]] || "#E879F9", fontWeight:600 }}>{bottom[0]}</span> gets the least ({(bottom[1] as number).toFixed(1)}%) despite a quality score of <span style={{ color:"#22D3EE" }}>{bottomQ}%</span>.{" "}
            That's a <span style={{ color:"#F87171", fontWeight:700 }}>{ratio}× gap</span> in reach — driven entirely by algorithm weights, not content quality.
          </div>
        </CardContent>
      </Card>

      {/* Plotly Scatter */}
      <Card style={{ background:"#0E1030", border:"0.5px solid #2A2D5A" }}>
        <CardHeader style={{ padding:"14px 16px 0" }}>
          <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>
            Exposure vs Quality — hover dots for details
          </div>
        </CardHeader>
        <CardContent style={{ padding:"8px 16px 14px" }}>
          <Plot
            data={plotlyTraces}
            layout={plotlyLayout as any}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width:"100%", height:260 }}
          />
        </CardContent>
      </Card>

      {/* Category bar */}
      <Card style={{ background:"#0E1030", border:"0.5px solid #2A2D5A" }}>
        <CardHeader style={{ padding:"14px 16px 0" }}>
          <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>
            Total Exposure Share by Category
          </div>
        </CardHeader>
        <CardContent style={{ padding:"8px 16px 14px" }}>
          <ReactECharts option={catOption} style={{ height:180 }} />
        </CardContent>
      </Card>
    </div>
  );
}
