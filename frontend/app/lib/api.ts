const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Weights {
  w_quality: number; w_popularity: number; w_recency: number;
  w_diversity: number; w_engagement: number;
}

export interface Item {
  id: string; title: string; category: string; source: string;
  quality_score: number; base_popularity: number;
  composite_score: number; rank: number;
  signal_breakdown: Record<string, number>;
}

export interface RecoResponse {
  items: Item[]; avg_score: number; avg_quality: number;
  top_category: string; total_items: number;
}

export interface Scenario {
  id: string; title: string; emoji: string; platform: string;
  desc: string; risk: string; weights: Weights;
}

export interface FeedbackItem {
  id: string; title: string; category: string;
  composite_score: number; boosted_popularity: number;
  rank: number; click_boost: number; click_count: number;
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const CATS = ["Technology","Politics","Science","Entertainment","Finance","Health"];
const TITLES = [
  "AI Regulation Debate","CRISPR Breakthrough 2024","Market Crash Analysis",
  "Viral Dance Trend #8","Mental Health Crisis Guide","Quantum Computing 101",
  "Celebrity Drama Exposed","Global Temp Data 2024","Startup Funding Trends",
  "Meme Compilation #42","Neural Interface Study","Election Polling Deep Dive",
  "Obesity Drug GLP-1 Trial","Web3 Post-Mortem","James Webb Telescope Images",
  "Hedge Fund Strategy Leak","AI Art Copyright War","Sleep Optimization Science",
  "Chip War: TSMC & NVIDIA","Influencer Collapse Story","Pandemic Preparedness 2025",
  "Carbon Credit Fraud Report","Mars Colony Timeline","Dark Money in Politics",
];

function mockItems(weights: Weights, category = "All"): Item[] {
  const t = Object.values(weights).reduce((a, b) => a + b, 1e-9);
  const w = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / t]));
  const items = TITLES.map((title, i) => {
    const q = 0.2 + (i % 10) * 0.07;
    const p = 0.15 + ((i * 7) % 10) * 0.08;
    const r = 0.3 + ((i * 3) % 10) * 0.07;
    const d = 0.4 + ((i * 5) % 10) * 0.06;
    const e = 0.25 + (i % 5) * 0.1;
    const score = w.w_quality*q + w.w_popularity*p + w.w_recency*r + w.w_diversity*d + w.w_engagement*e;
    return {
      id: `item_${String(i).padStart(2, "0")}`, title,
      category: CATS[i % CATS.length],
      source: "Synthetic",
      quality_score: parseFloat(q.toFixed(3)),
      base_popularity: parseFloat(p.toFixed(3)),
      composite_score: parseFloat(score.toFixed(4)),
      rank: i + 1,
      signal_breakdown: {
        quality:    parseFloat((w.w_quality * q).toFixed(4)),
        popularity: parseFloat((w.w_popularity * p).toFixed(4)),
        recency:    parseFloat((w.w_recency * r).toFixed(4)),
        diversity:  parseFloat((w.w_diversity * d).toFixed(4)),
        engagement: parseFloat((w.w_engagement * e).toFixed(4)),
      },
    };
  })
    .sort((a, b) => b.composite_score - a.composite_score)
    .map((item, i) => ({ ...item, rank: i + 1 }));
  return category === "All" ? items : items.filter(i => i.category === category);
}

async function safeFetch<T>(url: string, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Real Rails] API offline — using mock fallback");
    return fallback();
  }
}

function wq(weights: Weights) {
  return `w_quality=${weights.w_quality}&w_popularity=${weights.w_popularity}&w_recency=${weights.w_recency}&w_diversity=${weights.w_diversity}&w_engagement=${weights.w_engagement}`;
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function fetchRecommendations(
  weights: Weights, category = "All", top_n = 12, forceMock = false, isLive = false
): Promise<RecoResponse> {
  const fallback = () => {
    const items = mockItems(weights, category).slice(0, top_n);
    return {
      items,
      avg_score:    parseFloat((items.reduce((s, i) => s + i.composite_score, 0) / (items.length || 1)).toFixed(4)),
      avg_quality:  parseFloat((items.reduce((s, i) => s + i.quality_score, 0) / (items.length || 1)).toFixed(4)),
      top_category: items[0]?.category ?? "Technology",
      total_items:  items.length,
    };
  };
  if (forceMock) return fallback();
  const endpoint = isLive ? "live-recommendations" : "recommendations";
  const url = `${API}/api/${endpoint}?${wq(weights)}&category=${encodeURIComponent(category)}&top_n=${top_n}`;
  const res = await safeFetch<RecoResponse>(url, fallback);
  // Live feed not ready yet (GDELT still loading / rate-limited) → show synthetic
  // placeholder so the page is never blank. The hook keeps polling and swaps in
  // real articles the moment they arrive.
  if (isLive && (!res.items || res.items.length === 0)) return fallback();
  return res;
}

export async function fetchScoreDistribution(weights: Weights, forceMock = false, category = "All"): Promise<{ items: Item[] }> {
  if (forceMock) return { items: mockItems(weights, category) };
  return safeFetch(`${API}/api/score-distribution?${wq(weights)}&category=${encodeURIComponent(category)}`, () => ({ items: mockItems(weights, category) }));
}

export interface OutcomesResponse {
  scatter: Array<Item & { exposure: number }>;
  category_exposure: Record<string, number>;
  category_quality: Record<string, number>;
  quality_exposure_correlation: number;
}

export async function fetchOutcomes(weights: Weights, forceMock = false, category = "All"): Promise<OutcomesResponse> {
  const fallback = (): OutcomesResponse => {
    const items = mockItems(weights);
    const catExp: Record<string, number> = {}, catQ: Record<string, number> = {};
    const total = items.reduce((s, _, i) => s + 1 / (i + 1), 0);
    items.forEach((item, i) => {
      const exp = parseFloat(((1 / (i + 1)) / total * 100).toFixed(2));
      catExp[item.category] = parseFloat(((catExp[item.category] || 0) + exp).toFixed(2));
      catQ[item.category] = item.quality_score;
    });
    return {
      scatter: items.map((item, i) => ({ ...item, exposure: parseFloat(((1 / (i + 1)) / total * 100).toFixed(2)) })),
      category_exposure: catExp,
      category_quality: catQ,
      quality_exposure_correlation: 0.38,
    };
  };
  if (forceMock) return fallback();
  return safeFetch(`${API}/api/outcomes?${wq(weights)}&category=${encodeURIComponent(category)}`, fallback);
}

export async function fetchScenarios(): Promise<{ scenarios: Scenario[] }> {
  return safeFetch(`${API}/api/scenarios`, () => ({
    scenarios: [
      { id:"engagement_max", title:"Engagement Maximizer", emoji:"🔥", platform:"TikTok / YouTube Shorts",
        desc:"Pure engagement optimization. Virality wins over quality.", risk:"High popularity bias.",
        weights:{w_quality:0.05,w_popularity:0.4,w_recency:0.2,w_diversity:0.05,w_engagement:0.8} },
      { id:"editorial", title:"Editorial Quality Filter", emoji:"📰", platform:"The Economist / Substack",
        desc:"Quality-gated ranking. Only the best content surfaces.", risk:"Low reach for new creators.",
        weights:{w_quality:0.9,w_popularity:0.1,w_recency:0.3,w_diversity:0.3,w_engagement:0.1} },
      { id:"diversity_boost", title:"Diversity Boost", emoji:"🌍", platform:"Public Broadcasting",
        desc:"Forces exposure across underrepresented topics.", risk:"May surface low-engagement content.",
        weights:{w_quality:0.4,w_popularity:0.1,w_recency:0.2,w_diversity:0.9,w_engagement:0.2} },
      { id:"trending", title:"Trending / Recency First", emoji:"⚡", platform:"Twitter/X / Google News",
        desc:"Freshness dominates. Old content dies fast.", risk:"Promotes sensationalism.",
        weights:{w_quality:0.2,w_popularity:0.5,w_recency:0.9,w_diversity:0.1,w_engagement:0.3} },
      { id:"balanced", title:"Balanced Default", emoji:"⚖️", platform:"Netflix / Spotify",
        desc:"Equal weighting across all signals. No strong bias.", risk:"Jack of all trades.",
        weights:{w_quality:0.5,w_popularity:0.3,w_recency:0.2,w_diversity:0.2,w_engagement:0.4} },
    ],
  }));
}

export async function fetchFeedbackLoop(clicks: string[], forceMock = false): Promise<{ items: FeedbackItem[]; popularity_gap: number; gini_coefficient: number; total_clicks: number }> {
  if (forceMock) {
    const counts: Record<string, number> = {};
    clicks.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const items: FeedbackItem[] = TITLES.slice(0, 12).map((title, i) => {
      const id = `item_${String(i).padStart(2, "0")}`;
      const boost = (counts[id] || 0) * 0.09;
      const pop = Math.min(0.2 + i * 0.05 + boost, 1);
      return { id, title, category: CATS[i % CATS.length],
        composite_score: parseFloat((0.25 * 0.6 + 0.75 * pop).toFixed(4)),
        boosted_popularity: parseFloat(pop.toFixed(3)),
        rank: i + 1, click_boost: boost, click_count: counts[id] || 0 };
    }).sort((a, b) => b.composite_score - a.composite_score).map((item, i) => ({ ...item, rank: i + 1 }));
    const pops = items.map(i => i.boosted_popularity);
    return {
      items,
      popularity_gap: parseFloat((Math.max(...pops) - Math.min(...pops)).toFixed(3)),
      gini_coefficient: parseFloat((0.3 + clicks.length * 0.02).toFixed(3)),
      total_clicks: clicks.length,
    };
  }
  const url = `${API}/api/feedback-loop?clicks=${clicks.join(",")}`;
  return safeFetch(url, () => fetchFeedbackLoop(clicks, true));
}

export async function downloadSample(weights: Weights): Promise<void> {
  const data = await safeFetch<{ sample_data: Item[] }>(`${API}/api/download-sample`, () => ({
    sample_data: mockItems(weights),
  }));
  const csv = [
    "id,title,category,source,quality_score,base_popularity,composite_score,rank",
    ...data.sample_data.map(r => `${r.id},"${r.title}",${r.category},"${r.source}",${r.quality_score},${r.base_popularity},${r.composite_score},${r.rank}`)
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "rec_engine_sandbox_data.csv";
  a.click();
}

export interface LiveData {
  gdelt: { source: string; connected: boolean; count: number; articles: Array<{ title: string; url: string; domain: string; date: string; language: string }> };
  owid: { source: string; connected: boolean; avg_internet_usage: number; data_points: number; indicator: string };
}

export async function fetchLiveData(): Promise<LiveData> {
  return safeFetch(`${API}/api/live-data`, () => ({
    gdelt: { source: "gdelt_mock", connected: false, count: 0, articles: [] },
    owid: { source: "owid_mock", connected: false, avg_internet_usage: 54.3, data_points: 0, indicator: "Internet users as share of population" },
  }));
}
