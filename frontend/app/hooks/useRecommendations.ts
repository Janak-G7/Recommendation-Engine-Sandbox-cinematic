"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchRecommendations, fetchScoreDistribution, fetchOutcomes,
  fetchScenarios, fetchFeedbackLoop, fetchLiveData,
  type Weights, type Item, type Scenario, type FeedbackItem, type LiveData,
} from "../lib/api";

export const DEFAULT_WEIGHTS: Weights = {
  w_quality: 0.5, w_popularity: 0.3, w_recency: 0.2,
  w_diversity: 0.2, w_engagement: 0.4,
};

export function useRecommendations(dataMode: "synthetic" | "live" = "synthetic") {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState("pref");

  const [recommendations, setRecommendations] = useState<Item[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [avgQuality, setAvgQuality] = useState(0);
  const [topCategory, setTopCategory] = useState("");
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [outcomes, setOutcomes] = useState<any>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [clicks, setClicks] = useState<string[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [popularityGap, setPopularityGap] = useState(0);
  const [gini, setGini] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [gdeltReady, setGdeltReady] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout>();
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLiveRef = useRef(dataMode === "live");
  const isLive = dataMode === "live";
  isLiveRef.current = isLive;
  const clicksRef = useRef<string[]>([]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      clearTimeout(debounceRef.current);
    };
  }, []);

  const loadReco = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchRecommendations(weights, category, 30, false, isLive);
      setRecommendations(d.items);
      setAvgScore(d.avg_score);
      setAvgQuality(d.avg_quality);
      setTopCategory(d.top_category);
    } finally {
      setLoading(false);
    }
  }, [weights, category, isLive]);

  const loadAll = useCallback(async () => {
    if (isLive) return;
    const d = await fetchScoreDistribution(weights, false, category);
    setAllItems(d.items);
  }, [weights, isLive, category]);

  const loadOutcomes = useCallback(async () => {
    if (isLive) return;
    const d = await fetchOutcomes(weights, false, category);
    setOutcomes(d);
  }, [weights, isLive, category]);

  const loadFeedback = useCallback(async () => {
    if (isLive) {
      if (!recommendations.length) return;
      const counts: Record<string, number> = {};
      clicksRef.current.forEach((id: string) => { counts[id] = (counts[id] || 0) + 1; });
      const boosted = recommendations.map((item: Item, i: number) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        composite_score: parseFloat((item.composite_score + (counts[item.id] || 0) * 0.09).toFixed(4)),
        boosted_popularity: Math.min(item.base_popularity + (counts[item.id] || 0) * 0.09, 1),
        rank: i + 1,
        click_boost: (counts[item.id] || 0) * 0.09,
        click_count: counts[item.id] || 0,
      })).sort((a: any, b: any) => b.composite_score - a.composite_score).map((item: any, i: number) => ({ ...item, rank: i + 1 }));
      const pops = boosted.map((i: any) => i.boosted_popularity);
      const gap = pops.length ? parseFloat((Math.max(...pops) - Math.min(...pops)).toFixed(3)) : 0;
      const arr = [...boosted.map((i: any) => i.composite_score)].sort((a: number, b: number) => a - b);
      const n = arr.length;
      const idx = arr.map((_: number, i: number) => i + 1);
      const giniVal = n ? parseFloat(((2 * idx.reduce((s: number, v: number, i: number) => s + v * arr[i], 0) / (n * arr.reduce((a: number, b: number) => a + b, 0))) - (n + 1) / n).toFixed(3)) : 0;
      setFeedbackItems(boosted);
      setPopularityGap(gap);
      setGini(giniVal);
      setTotalClicks(clicksRef.current.length);
      return;
    }
    const d = await fetchFeedbackLoop(clicksRef.current, false);
    setFeedbackItems(d.items);
    setPopularityGap(d.popularity_gap);
    setGini(d.gini_coefficient);
    setTotalClicks(d.total_clicks);
  }, [isLive, recommendations]);

  const loadLiveDataRef = useRef<() => void>();
  const loadLiveData = useCallback(async () => {
    if (!isLiveRef.current) return;
    const d = await fetchLiveData();
    setLiveData(d);
    if (d.gdelt.source === "gdelt_loading" || d.gdelt.count === 0) {
      retryTimer.current = setTimeout(() => loadLiveDataRef.current?.(), 3000);
    } else {
      setGdeltReady(true);
    }
  }, []);
  loadLiveDataRef.current = loadLiveData;

  // In live mode: load immediately (synthetic placeholder until GDELT is ready),
  // then re-load when gdeltReady flips true to swap in real articles.
  useEffect(() => {
    if (isLive) {
      loadReco();
    }
  }, [gdeltReady, isLive, loadReco]);

  // synthetic debounce
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!isLive) {
        loadReco();
        loadAll();
        loadOutcomes();
      }
    }, 180);
  }, [loadReco, loadAll, loadOutcomes, isLive]);

  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  // initial live data poll
  useEffect(() => { loadLiveData(); }, [loadLiveData]);

  useEffect(() => { fetchScenarios().then(d => setScenarios(d.scenarios)); }, []);

  // switching modes — MUST be after loadLiveData is declared
  useEffect(() => {
    if (!isLive) {
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
      setGdeltReady(false);
      setRecommendations([]);
    } else {
      setRecommendations([]);
      setLoading(true);
      loadLiveData();
    }
    setFeedbackItems([]);
  }, [isLive, loadLiveData]);

  const handleClick = useCallback((id: string) => {
    const next = [...clicksRef.current, id];
    clicksRef.current = next;
    setClicks(next);
    loadFeedback();
  }, [loadFeedback]);

  const resetClicks = useCallback(() => {
    clicksRef.current = [];
    setClicks([]);
    loadFeedback();
  }, [loadFeedback]);

  const scenarioLoadRef = useRef(false);
  const loadScenario = useCallback((w: Weights) => {
    scenarioLoadRef.current = true;
    setWeights(w);
  }, []);

  // Switch to pref tab after scenario weight change, reliably
  useEffect(() => {
    if (scenarioLoadRef.current) {
      scenarioLoadRef.current = false;
      setTab("pref");
    }
  }, [weights]);

  return {
    weights, setWeights, category, setCategory, tab, setTab,
    recommendations, avgScore, avgQuality, topCategory,
    allItems, outcomes, scenarios, clicks,
    feedbackItems, popularityGap, gini, totalClicks,
    loading, handleClick, resetClicks, loadScenario,
    isLive, liveData, gdeltReady,
  };
}
