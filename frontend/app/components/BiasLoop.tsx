"use client";
import ReactECharts from "echarts-for-react";
import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { type FeedbackItem } from "../lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CAT_COLOR: Record<string,string> = {
  Technology:"#22D3EE", Politics:"#E879F9", Science:"#34D399",
  Entertainment:"#F59E0B", Finance:"#A78BFA", Health:"#F87171",
};

const LOOP_STAGES = [
  { icon:"👁", label:"User sees ranked list",    desc:"Algorithm puts top-scored items first. Most users never scroll past rank 5." },
  { icon:"👆", label:"User clicks top item",      desc:"An engagement signal fires and gets logged in the interaction matrix." },
  { icon:"📈", label:"Score is boosted",          desc:"The click increases the item's popularity weight in the scoring formula." },
  { icon:"🏆", label:"Item ranks even higher",   desc:"Next user also sees it at #1, and is more likely to click it too." },
  { icon:"🔄", label:"Cycle locks in",            desc:"The loop becomes self-sustaining. Quality no longer predicts ranking." },
];

function D3PopularityChart({ items, counts }: { items: FeedbackItem[], counts: Record<string,number> }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || items.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 300;
    const height = 160;
    const margin = { top: 10, right: 10, bottom: 40, left: 10 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const data = items.slice(0, 8).map(item => ({
      ...item,
      boosted_popularity: Math.min(item.boosted_popularity + (counts[item.id]||0) * 0.09, 1),
      click_count: counts[item.id] || 0,
    }));

    const x = d3.scaleBand().domain(data.map(d => d.id)).range([0, innerW]).padding(0.25);
    const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll(".grid").data(y.ticks(4)).join("line")
      .attr("class", "grid").attr("x1", 0).attr("x2", innerW)
      .attr("y1", d => y(d)).attr("y2", d => y(d))
      .attr("stroke", "#2A2D5A").attr("stroke-width", 0.5);

    g.selectAll(".bar").data(data).join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.id) ?? 0).attr("width", x.bandwidth())
      .attr("y", innerH).attr("height", 0).attr("rx", 3)
      .attr("fill", d => d.click_count > 0 ? "#F59E0B" : "#22D3EE").attr("opacity", 0.85)
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("y", d => y(d.boosted_popularity))
      .attr("height", d => innerH - y(d.boosted_popularity));

    g.selectAll(".badge").data(data.filter(d => d.click_count > 0)).join("text")
      .attr("class", "badge")
      .attr("x", d => (x(d.id) ?? 0) + x.bandwidth() / 2)
      .attr("y", d => y(d.boosted_popularity) - 4)
      .attr("text-anchor", "middle").attr("fill", "#F59E0B")
      .attr("font-size", 9).attr("font-weight", 700)
      .text(d => `+${d.click_count}`);

    g.selectAll(".label").data(data).join("text")
      .attr("class", "label")
      .attr("x", d => (x(d.id) ?? 0) + x.bandwidth() / 2)
      .attr("y", innerH + 14).attr("text-anchor", "middle")
      .attr("fill", "#64748B").attr("font-size", 8)
      .text(d => d.title.length > 10 ? d.title.slice(0, 10) + "…" : d.title)
      .attr("transform", d => `rotate(-25, ${(x(d.id) ?? 0) + x.bandwidth() / 2}, ${innerH + 14})`);

  }, [items, counts]);

  return <svg ref={svgRef} style={{ width:"100%", height:160 }} />;
}

interface Props {
  items: FeedbackItem[]; clicks: string[];
  popularityGap: number; gini: number; totalClicks: number;
  onItemClick: (id: string) => void; onReset: () => void;
}

export default function BiasLoop({ items, clicks, popularityGap, gini, totalClicks, onItemClick, onReset }: Props) {
  const counts: Record<string,number> = {};
  clicks.forEach(id => { counts[id] = (counts[id]||0)+1; });

  const activeStage = Math.min(Math.floor(totalClicks/2), LOOP_STAGES.length-1);
  const isLocked = totalClicks >= 10;

  const initialTop3 = useRef<FeedbackItem[] | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (items.length > 0 && initialTop3.current === null) {
      initialTop3.current = items.slice(0, 3);
    }
  }, [items]);

  useEffect(() => {
    if (totalClicks >= 3) setShowComparison(true);
  }, [totalClicks]);

  const currentTop3 = items.slice(0, 3);

  const giniOption = {
    backgroundColor:"transparent",
    grid:{ top:8, bottom:30, left:8, right:8, containLabel:true },
    xAxis:{ type:"category", data:["Ideal (Equal)","Current State"], axisLabel:{ color:"#64748B", fontSize:10 }, axisLine:{ lineStyle:{ color:"#2A2D5A" } } },
    yAxis:{ type:"value", max:1, axisLabel:{ color:"#64748B", fontSize:9 }, splitLine:{ lineStyle:{ color:"#2A2D5A" } } },
    tooltip:{ backgroundColor:"#0E1030", borderColor:"#2A2D5A", textStyle:{ color:"#E2E8F0", fontSize:11 } },
    series:[{ type:"bar", barWidth:40, data:[
      { value:0.0, itemStyle:{ color:"#34D399", borderRadius:[3,3,0,0] } },
      { value: Math.min(gini,1), itemStyle:{ color: gini>0.5?"#F87171":gini>0.3?"#F59E0B":"#22D3EE", borderRadius:[3,3,0,0] } },
    ]}],
  };

  return (
    <div className="flex flex-col gap-4">

      <Card style={{ background:"#0E1030", border:"0.5px solid #2A2D5A" }}>
        <CardContent style={{ padding:"12px 16px" }}>
          <p style={{ fontSize:11, color:"#94A3B8", lineHeight:1.7, margin:0 }}>
            <span style={{ color:"#F59E0B", fontWeight:600 }}>What is popularity bias?</span> When a recommendation system prioritizes engagement signals, popular content becomes more popular simply because it was already popular — not because it's better. Click the tiles below to simulate user clicks and watch how the bias compounds over time.
          </p>
        </CardContent>
      </Card>

      <Card style={{ background:"#0E1030", border:"0.5px solid #2A2D5A" }}>
        <CardHeader style={{ padding:"14px 16px 0" }}>
          <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>
            Simulate User Clicks — tap an item to "engage" with it
          </div>
        </CardHeader>
        <CardContent style={{ padding:"14px 16px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {items.slice(0,9).map(item => {
              const c = counts[item.id]||0;
              const hot = c >= 3;
              const displayScore = item.composite_score + c * 0.09;
              const displayPop = Math.min(item.boosted_popularity + c * 0.09, 1);
              return (
                <button key={item.id} onClick={() => onItemClick(item.id)} className="rr-card-hover" style={{
                  background: hot ? "rgba(245,158,11,0.07)" : "#14163C",
                  border:`0.5px solid ${hot ? "rgba(245,158,11,0.45)" : "#2A2D5A"}`,
                  borderRadius:6, padding:"9px 11px", cursor:"pointer", textAlign:"left",
                  transition:"all 0.2s", position:"relative",
                }}>
                  {c > 0 && (
                    <Badge style={{ position:"absolute", top:6, right:7, fontSize:8, background:"rgba(245,158,11,0.2)", color:"#F59E0B", border:"none", padding:"1px 5px" }}>
                      +{c}
                    </Badge>
                  )}
                  <div style={{ fontSize:9, color:CAT_COLOR[item.category]||"#64748B", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>{item.category}</div>
                  <div style={{ fontSize:11, color:"#E2E8F0", fontWeight:500, marginBottom:5, lineHeight:1.3 }}>{item.title}</div>
                  <div style={{ background:"#2A2D5A", height:3, borderRadius:2 }}>
                    <div style={{ background: hot?"#F59E0B":"#22D3EE", height:3, borderRadius:2, width:`${displayPop*100}%`, transition:"width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize:9, color:"#64748B", marginTop:3 }}>
                    score: <span style={{ color: hot?"#F59E0B":"#22D3EE", fontWeight:600 }}>{displayScore.toFixed(3)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display:"flex", gap:14, padding:"10px 0", borderTop:"1px solid #2A2D5A", flexWrap:"wrap", alignItems:"center" }}>
            {[
              { label:"Total Clicks", val:totalClicks, color:"#22D3EE" },
              { label:"Popularity Gap", val:`${(popularityGap*100).toFixed(1)}%`, color:"#F59E0B" },
              { label:"Gini Coefficient", val:gini.toFixed(3), color: gini>0.5?"#F87171":gini>0.3?"#F59E0B":"#34D399" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:9, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.07em" }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:700, color:s.color }} className="num-transition">{s.val}</div>
              </div>
            ))}
            {isLocked && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#F87171", animation:"pulse 1s infinite" }} />
                <span style={{ fontSize:11, color:"#F87171", fontWeight:600 }}>BIAS LOOP LOCKED IN</span>
              </div>
            )}
            <Button variant="ghost" size="sm"
              onClick={() => { onReset(); initialTop3.current = null; setShowComparison(false); }}
              style={{ marginLeft:"auto", color:"#64748B", border:"0.5px solid #2A2D5A", fontSize:10, textTransform:"uppercase" }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card style={{ background:"#0E1030", border:"0.5px solid #2A2D5A" }}>
        <CardHeader style={{ padding:"14px 16px 0" }}>
          <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>
            Popularity Distribution — <span style={{ color:"#F59E0B" }}>amber</span> bars have received clicks
          </div>
        </CardHeader>
        <CardContent style={{ padding:"8px 16px 14px" }}>
          <D3PopularityChart items={items} counts={counts} />
        </CardContent>
      </Card>

      {showComparison && initialTop3.current && (
        <Card style={{ background:"#0E1030", border:"0.5px solid rgba(245,158,11,0.3)", animation:"fadeIn 0.4s ease" }}>
          <CardHeader style={{ padding:"14px 16px 0" }}>
            <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Before vs After — how bias reshaped the top 3
            </div>
          </CardHeader>
          <CardContent style={{ padding:"14px 16px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:12, alignItems:"start" }}>
              <div>
                <div style={{ fontSize:9, color:"#34D399", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontWeight:700 }}>Before Clicks</div>
                {initialTop3.current.map((item, i) => (
                  <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, padding:"7px 10px", background:"rgba(52,211,153,0.04)", border:"0.5px solid rgba(52,211,153,0.15)", borderRadius:6 }}>
                    <span style={{ fontSize:12, fontWeight:800, color:"#34D399", width:20 }}>#{i+1}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, color:"#E2E8F0", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
                      <div style={{ fontSize:9, color:"#64748B" }}>{item.composite_score.toFixed(3)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", paddingTop:30 }}>
                <div style={{ fontSize:20, color:"#F59E0B" }}>→</div>
              </div>
              <div>
                <div style={{ fontSize:9, color:"#F59E0B", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontWeight:700 }}>After {totalClicks} Clicks</div>
                {currentTop3.map((item, i) => {
                  const wasInTop3 = initialTop3.current?.some(x => x.id === item.id);
                  const isNew = !wasInTop3;
                  return (
                    <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, padding:"7px 10px", background: isNew ? "rgba(245,158,11,0.06)" : "rgba(248,113,113,0.04)", border:`0.5px solid ${isNew ? "rgba(245,158,11,0.3)" : "rgba(248,113,113,0.15)"}`, borderRadius:6 }}>
                      <span style={{ fontSize:12, fontWeight:800, color: isNew ? "#F59E0B" : "#F87171", width:20 }}>#{i+1}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, color:"#E2E8F0", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
                        <div style={{ fontSize:9, color:"#64748B" }}>
                          {(item.composite_score + (counts[item.id]||0) * 0.09).toFixed(3)}
                          {isNew && <Badge style={{ marginLeft:5, fontSize:8, background:"rgba(245,158,11,0.15)", color:"#F59E0B", border:"0.5px solid rgba(245,158,11,0.4)" }}>NEW</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop:10, fontSize:10, color:"#64748B", lineHeight:1.6 }}>
              Items marked <span style={{ color:"#F59E0B", fontWeight:700 }}>NEW</span> entered the top 3 purely due to click volume — not quality. Items that dropped out were displaced by popularity bias.
            </div>
          </CardContent>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card style={{ background:"#0E1030", border:"0.5px solid #2A2D5A" }}>
          <CardHeader style={{ padding:"14px 16px 0" }}>
            <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>Feedback Loop — Stage Progress</div>
          </CardHeader>
          <CardContent style={{ padding:"14px 16px" }}>
            {LOOP_STAGES.map((stage,i) => (
              <div key={i}>
                <div style={{
                  display:"flex", alignItems:"flex-start", gap:10, padding:"9px 10px",
                  border:`0.5px solid ${i<=activeStage ? "rgba(34,211,238,0.35)" : "#2A2D5A"}`,
                  borderRadius:6, background: i<=activeStage ? "rgba(34,211,238,0.04)" : "transparent",
                  marginBottom:4, transition:"all 0.35s ease",
                }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{stage.icon}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color: i<=activeStage ? "#E2E8F0" : "#64748B" }}>{stage.label}</div>
                    <div style={{ fontSize:10, color:"#64748B", lineHeight:1.45 }}>{stage.desc}</div>
                  </div>
                </div>
                {i < LOOP_STAGES.length-1 && (
                  <div style={{ fontSize:11, color: i<activeStage ? "#22D3EE":"#2A2D5A", textAlign:"center", marginBottom:4, transition:"color 0.3s" }}>↓</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card style={{ background:"#0E1030", border:"0.5px solid #2A2D5A" }}>
          <CardHeader style={{ padding:"14px 16px 0" }}>
            <div style={{ fontSize:10, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>Inequality — Gini Coefficient</div>
          </CardHeader>
          <CardContent style={{ padding:"8px 16px 14px" }}>
            <div style={{ fontSize:10, color:"#64748B", marginBottom:12, lineHeight:1.5 }}>
              0 = perfectly equal exposure. 1 = one item gets everything. Watch it rise as you click.
            </div>
            <ReactECharts option={giniOption} style={{ height:160 }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
