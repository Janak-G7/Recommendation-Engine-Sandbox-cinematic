"""
Real Rails — PoC #49: Recommendation Engine Sandbox
Backend: FastAPI + Pandas + DuckDB
Rail: Distribution & Demand

Two separate pipelines:
1. LIVE DATA — GDELT + OWID real API calls → /api/live-data
2. SYNTHETIC — interaction matrix → /api/recommendations and all other routes
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import duckdb
import requests
import threading
import time
import hashlib
from dotenv import load_dotenv
import os

load_dotenv()

GDELT_API_URL = os.getenv("GDELT_API_URL", "https://api.gdeltproject.org/api/v2/doc/doc")
OWID_API_URL = os.getenv("OWID_API_URL", "https://api.ourworldindata.org/v1/indicators")
OWID_INDICATOR_ID = os.getenv("OWID_INDICATOR_ID", "935626")

app = FastAPI(title="Recommendation Engine Sandbox — Real Rails #49", version="2.0.0")

# CORS — set ALLOWED_ORIGINS in Render to your frontend URL (comma-separated),
# or leave default to allow localhost + any *.onrender.com deployment.
_origins_env = os.getenv("ALLOWED_ORIGINS", "")
_allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# LIVE DATA PIPELINE — GDELT + OWID
# ─────────────────────────────────────────────────────────────
_FALLBACK_CATS = ["Technology", "Politics", "Science", "Entertainment", "Finance", "Health"]
_fallback_idx = 0

def detect_category(title: str) -> str:
    global _fallback_idx
    t = title.lower()
    if any(w in t for w in ["techcrunch","wired","verge","engadget","arstechnica","tech","software","ai","artificial intelligence","computer","internet","robot","cyber","chip","digital","app","data","cloud","startup","algorithm","machine learning","neural","semiconductor","smartphone","iphone","android","microsoft","google","apple","meta","nvidia","openai"]):
        return "Technology"
    if any(w in t for w in ["politico","thehill","politic","election","government","president","congress","senate","democrat","republican","vote","parliament","minister","policy","law","legislation","bill","treaty","diplomat","white house","kremlin","nato","sanctions","campaign","ballot","party","geopolit","war","conflict","military","army","protest","coup","referendum"]):
        return "Politics"
    if any(w in t for w in ["nature","newscientist","science","research","study","space","nasa","climate","discovery","lab","physics","biology","chemistry","genome","dna","species","planet","asteroid","telescope","experiment","fossil","quantum","particle","peer review","journal","arxiv","cern","evolution","ocean","earthquake","volcano"]):
        return "Science"
    if any(w in t for w in ["variety","billboard","hollywood","film","music","celebrity","entertainment","movie","tv","show","actor","singer","award","album","concert","festival","streaming","netflix","spotify","disney","box office","trailer","oscars","grammy","emmy","fashion","viral","tiktok","youtube","influencer","meme","game","esport"]):
        return "Entertainment"
    if any(w in t for w in ["bloomberg","reuters","wsj","market","stock","finance","economy","bank","invest","fund","crypto","trade","gdp","inflation","interest rate","fed","hedge","venture","ipo","earnings","revenue","recession","dollar","euro","bitcoin","ethereum","commodity","oil","gold","mortgage","debt","budget","tax","tariff","imf","world bank"]):
        return "Finance"
    if any(w in t for w in ["healthline","webmd","mayoclinic","health","medical","medicine","disease","hospital","drug","vaccine","cancer","mental","doctor","patient","surgery","pandemic","virus","fda","obesity","diabetes","heart","brain","nutrition","diet","exercise","therapy","clinical","pharma","wellbeing","outbreak","epidemic","syndrome","treatment","diagnosis"]):
        return "Health"
    cat = _FALLBACK_CATS[_fallback_idx % len(_FALLBACK_CATS)]
    _fallback_idx += 1
    return cat


def _score(title: str, salt: str) -> float:
    h = int(hashlib.md5((title + salt).encode()).hexdigest(), 16)
    return round(0.2 + (h % 1000) / 1250, 3)


def fetch_gdelt_articles():
    if not GDELT_API_URL:
        print("[GDELT] No API URL configured — using mock")
        return {"source": "gdelt_mock", "connected": False, "count": 0, "articles": []}
    # One request per call. The lazy-refetch loop in the route paces retries so we
    # don't hammer GDELT (which is exactly what triggers the rate limit).
    try:
        res = requests.get(GDELT_API_URL, params={
            "query": "(technology OR politics OR science OR finance OR health)",
            "mode": "artlist",
            "maxrecords": 75,
            "format": "json",
            "sort": "DateDesc",
            "timespan": "24h",
        }, headers={"User-Agent": "Mozilla/5.0 (RealRails PoC49)"}, timeout=30)
        if res.status_code == 200 and res.text.strip().startswith("{"):
            articles = res.json().get("articles", [])
            print(f"[GDELT] Total: {len(articles)}")
            return {
                "source": "gdelt_live",
                "connected": True,
                "count": len(articles),
                "articles": [
                    {
                        "title":    a.get("title", ""),
                        "url":      a.get("url", ""),
                        "domain":   a.get("domain", ""),
                        "date":     a.get("seendate", ""),
                        "language": a.get("language", ""),
                        "category": detect_category(a.get("title", "") + " " + a.get("domain", "")),
                    }
                    for a in articles if a.get("title")
                ],
            }
        elif "limit" in res.text.lower():
            print("[GDELT] Rate limited — backing off, will retry on next cycle")
            return {"source": "gdelt_ratelimited", "connected": False, "count": 0, "articles": []}
        else:
            print(f"[GDELT] bad response — {res.text[:100]}")
    except Exception as e:
        print(f"[GDELT] Failed: {e}")
    return {"source": "gdelt_mock", "connected": False, "count": 0, "articles": []}


def fetch_owid_data():
    try:
        url = f"{OWID_API_URL}/{OWID_INDICATOR_ID}.data.json"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            values = data.get("values", [])
            if values:
                avg = sum(values) / len(values)
                return {
                    "source": "owid_live",
                    "connected": True,
                    "avg_internet_usage": round(avg, 2),
                    "data_points": len(values),
                    "indicator": "Internet users as share of population",
                }
    except Exception as e:
        print(f"[OWID] Failed to fetch live data: {e}")
    return {
        "source": "owid_mock",
        "connected": False,
        "avg_internet_usage": 54.3,
        "data_points": 0,
        "indicator": "Internet users as share of population",
    }


# Fetch OWID on startup, GDELT in background
OWID_SIGNAL = fetch_owid_data()
GDELT_DATA: dict = {"source": "gdelt_loading", "connected": False, "count": 0, "articles": []}

_gdelt_fetching = False
_gdelt_last_attempt = 0.0

def _bg_fetch_gdelt():
    global GDELT_DATA, _gdelt_fetching, _gdelt_last_attempt
    _gdelt_fetching = True
    _gdelt_last_attempt = time.time()
    try:
        GDELT_DATA = fetch_gdelt_articles()
        print(f"[GDELT] Source: {GDELT_DATA['source']} | Articles fetched: {GDELT_DATA['count']}")
    finally:
        _gdelt_fetching = False

def maybe_refetch_gdelt():
    """If live data isn't connected, retry — but no more than once every 20s
    so we respect GDELT's rate limit. Lets the frontend recover without a restart."""
    global _gdelt_fetching
    if GDELT_DATA.get("connected"):
        return
    if _gdelt_fetching:
        return
    if time.time() - _gdelt_last_attempt < 45:
        return
    threading.Thread(target=_bg_fetch_gdelt, daemon=True).start()

# initial fetch shortly after startup
def _initial_fetch():
    time.sleep(2)
    _bg_fetch_gdelt()

threading.Thread(target=_initial_fetch, daemon=True).start()
print(f"[OWID]  Source: {OWID_SIGNAL['source']} | Avg internet usage: {OWID_SIGNAL['avg_internet_usage']}%")
print("[GDELT] Fetching in background...")

# ─────────────────────────────────────────────────────────────
# SYNTHETIC DATA PIPELINE
# ─────────────────────────────────────────────────────────────
np.random.seed(42)

CATEGORIES = ["Technology", "Politics", "Science", "Entertainment", "Finance", "Health"]

ITEMS = [
    ("AI Regulation Debate",        "Politics",      0.82, 0.45),
    ("CRISPR Breakthrough 2024",    "Science",       0.91, 0.30),
    ("Market Crash Analysis",       "Finance",       0.75, 0.60),
    ("Viral Dance Trend #8",        "Entertainment", 0.38, 0.95),
    ("Mental Health Crisis Guide",  "Health",        0.88, 0.40),
    ("Quantum Computing 101",       "Technology",    0.85, 0.25),
    ("Celebrity Drama Exposed",     "Entertainment", 0.22, 0.90),
    ("Global Temp Data 2024",       "Science",       0.89, 0.35),
    ("Startup Funding Trends",      "Finance",       0.70, 0.55),
    ("Meme Compilation #42",        "Entertainment", 0.15, 0.98),
    ("Neural Interface Study",      "Technology",    0.93, 0.20),
    ("Election Polling Deep Dive",  "Politics",      0.78, 0.65),
    ("Obesity Drug GLP-1 Trial",    "Health",        0.86, 0.42),
    ("Web3 Post-Mortem",            "Technology",    0.60, 0.50),
    ("James Webb Telescope Images", "Science",       0.94, 0.70),
    ("Hedge Fund Strategy Leak",    "Finance",       0.72, 0.48),
    ("AI Art Copyright War",        "Politics",      0.80, 0.55),
    ("Sleep Optimization Science",  "Health",        0.77, 0.38),
    ("Chip War: TSMC & NVIDIA",     "Technology",    0.83, 0.45),
    ("Influencer Collapse Story",   "Entertainment", 0.20, 0.92),
    ("Pandemic Preparedness 2025",  "Health",        0.84, 0.33),
    ("Carbon Credit Fraud Report",  "Finance",       0.76, 0.40),
    ("Mars Colony Timeline",        "Science",       0.90, 0.60),
    ("Dark Money in Politics",      "Politics",      0.81, 0.50),
]

df_items = pd.DataFrame(ITEMS, columns=["title", "category", "quality_score", "base_popularity"])
df_items["id"] = [f"item_{i:02d}" for i in range(len(ITEMS))]
df_items["source"] = "Synthetic"

rng = np.random.default_rng(seed=99)
df_items["recency_score"] = rng.uniform(0.3, 1.0, len(df_items))

USER_MATRIX = np.random.beta(0.5, 2.0, size=(100, len(ITEMS)))
for j, (_, row) in enumerate(df_items.iterrows()):
    USER_MATRIX[:, j] *= (0.4 + row["base_popularity"] * 0.8)

con = duckdb.connect()
con.register("items", df_items)
con.register("interactions", pd.DataFrame(USER_MATRIX, columns=df_items["id"].tolist()))

def query_category_stats() -> dict:
    result = con.execute("""
        SELECT
            category,
            ROUND(AVG(quality_score), 3) AS avg_quality,
            ROUND(AVG(base_popularity), 3) AS avg_popularity,
            COUNT(*) AS item_count
        FROM items
        GROUP BY category
        ORDER BY avg_quality DESC
    """).fetchdf()
    return result.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# SCORING ENGINE
# ─────────────────────────────────────────────────────────────
def compute_scores(wq: float, wp: float, wr: float, wd: float, we: float) -> pd.DataFrame:
    df = df_items.copy()
    total = wq + wp + wr + wd + we or 1.0
    wq, wp, wr, wd, we = wq/total, wp/total, wr/total, wd/total, we/total

    df["diversity_bonus"] = 1 - (df.groupby("category").cumcount() * 0.18).clip(0, 0.65)
    raw_eng = USER_MATRIX.mean(axis=0)
    df["engagement_score"] = (raw_eng - raw_eng.min()) / (raw_eng.max() - raw_eng.min() + 1e-9)

    df["composite_score"] = (
        wq * df["quality_score"]
        + wp * df["base_popularity"]
        + wr * df["recency_score"]
        + wd * df["diversity_bonus"]
        + we * df["engagement_score"]
    ).round(4)

    df["signal_breakdown"] = df.apply(lambda r: {
        "quality":    round(wq * r["quality_score"], 4),
        "popularity": round(wp * r["base_popularity"], 4),
        "recency":    round(wr * r["recency_score"], 4),
        "diversity":  round(wd * r["diversity_bonus"], 4),
        "engagement": round(we * r["engagement_score"], 4),
    }, axis=1)

    df["rank"] = df["composite_score"].rank(ascending=False).astype(int)
    return df.sort_values("rank").reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok", "poc": "49", "rail": "Distribution & Demand",
        "owid": OWID_SIGNAL["source"], "gdelt": GDELT_DATA["source"],
    }


@app.get("/api/live-data")
def get_live_data():
    maybe_refetch_gdelt()
    return {"gdelt": GDELT_DATA, "owid": OWID_SIGNAL}


@app.get("/api/live-recommendations")
def get_live_recommendations(
    w_quality: float = 0.5, w_popularity: float = 0.3,
    w_recency: float = 0.2, w_diversity: float = 0.2, w_engagement: float = 0.4,
    category: str = "All", top_n: int = 30,
):
    articles = GDELT_DATA.get("articles", [])
    if not articles:
        return {"items": [], "source": GDELT_DATA.get("source", "gdelt_mock"), "connected": False,
                "avg_score": 0, "avg_quality": 0, "top_category": "Technology", "total_items": 0}

    total = w_quality + w_popularity + w_recency + w_diversity + w_engagement or 1.0
    wq, wp, wr, wd, we = w_quality/total, w_popularity/total, w_recency/total, w_diversity/total, w_engagement/total
    owid_boost = 1 + (OWID_SIGNAL["avg_internet_usage"] / 1000)

    rows = []
    for i, a in enumerate(articles):
        title      = a.get("title", "")
        quality    = round(min(_score(title, "q") * owid_boost, 1.0), 3)
        popularity = _score(title, "p")
        recency    = _score(title, "r")
        diversity  = _score(title, "d")
        engagement = _score(title, "e")
        composite  = round(wq*quality + wp*popularity + wr*recency + wd*diversity + we*engagement, 4)
        rows.append({
            "id":              f"gdelt_{i:02d}",
            "title":           title[:80],
            "category":        a.get("category", "Technology"),
            "source":          "GDELT Live",
            "quality_score":   quality,
            "base_popularity": popularity,
            "composite_score": composite,
            "rank":            i + 1,
            "signal_breakdown": {
                "quality":    round(wq * quality, 4),
                "popularity": round(wp * popularity, 4),
                "recency":    round(wr * recency, 4),
                "diversity":  round(wd * diversity, 4),
                "engagement": round(we * engagement, 4),
            },
            "domain":   a.get("domain", ""),
            "url":      a.get("url", ""),
            "language": a.get("language", ""),
            "date":     a.get("date", ""),
        })

    rows.sort(key=lambda x: x["composite_score"], reverse=True)
    for i, r in enumerate(rows):
        r["rank"] = i + 1

    if category != "All":
        rows = [r for r in rows if r["category"] == category]

    rows = rows[:top_n]

    if not rows:
        return {"items": [], "avg_score": 0, "avg_quality": 0, "top_category": category,
                "total_items": 0, "source": "gdelt_live", "connected": True}

    avg_score    = round(sum(r["composite_score"] for r in rows) / len(rows), 4)
    avg_quality  = round(sum(r["quality_score"]   for r in rows) / len(rows), 4)
    top_category = max(set(r["category"] for r in rows), key=lambda c: sum(1 for r in rows if r["category"] == c))

    return {
        "items": rows, "avg_score": avg_score, "avg_quality": avg_quality,
        "top_category": top_category, "total_items": len(rows),
        "source": "gdelt_live", "connected": True,
    }


@app.get("/api/recommendations")
def get_recommendations(
    w_quality: float = 0.5, w_popularity: float = 0.3,
    w_recency: float = 0.2, w_diversity: float = 0.2, w_engagement: float = 0.4,
    category: str = "All", top_n: int = 30,
):
    df = compute_scores(w_quality, w_popularity, w_recency, w_diversity, w_engagement)
    if category != "All":
        df = df[df["category"] == category]
    df = df.head(top_n)
    return {
        "items":        df.drop(columns=["recency_score","diversity_bonus","engagement_score"]).to_dict(orient="records"),
        "avg_score":    round(float(df["composite_score"].mean()), 4),
        "avg_quality":  round(float(df["quality_score"].mean()), 4),
        "top_category": str(df["category"].value_counts().idxmax()),
        "total_items":  len(df),
    }


@app.get("/api/score-distribution")
def get_score_distribution(
    w_quality: float = 0.5, w_popularity: float = 0.3,
    w_recency: float = 0.2, w_diversity: float = 0.2, w_engagement: float = 0.4,
    category: str = "All",
):
    df = compute_scores(w_quality, w_popularity, w_recency, w_diversity, w_engagement)
    if category != "All":
        df = df[df["category"] == category]
    return {
        "items": df[["id","title","category","quality_score","base_popularity",
                     "composite_score","rank","signal_breakdown","source"]].to_dict(orient="records")
    }


@app.get("/api/outcomes")
def get_outcomes(
    w_quality: float = 0.5, w_popularity: float = 0.3,
    w_recency: float = 0.2, w_diversity: float = 0.2, w_engagement: float = 0.4,
    category: str = "All",
):
    df = compute_scores(w_quality, w_popularity, w_recency, w_diversity, w_engagement)
    inv_rank = 1.0 / df["rank"]
    df["exposure"] = (inv_rank / inv_rank.sum() * 100).round(2)
    cat_exposure = df.groupby("category")["exposure"].sum().round(2).to_dict()
    cat_quality  = df.groupby("category")["quality_score"].mean().round(3).to_dict()
    corr = float(df["quality_score"].corr(df["exposure"]))
    if category != "All":
        df = df[df["category"] == category]
    return {
        "scatter":                      df[["id","title","category","quality_score","exposure","rank"]].to_dict(orient="records"),
        "category_exposure":            cat_exposure,
        "category_quality":             cat_quality,
        "quality_exposure_correlation": round(corr, 3),
    }


@app.get("/api/category-stats")
def get_category_stats():
    return {"categories": query_category_stats()}


@app.get("/api/scenarios")
def get_scenarios():
    return {"scenarios": [
        {"id": "engagement_max", "title": "Engagement Maximizer",
         "emoji": "🔥", "platform": "TikTok / YouTube Shorts",
         "desc": "Pure engagement optimization — the TikTok/YouTube approach. Clicks and watch-time dominate.",
         "risk": "High popularity bias. Low-quality content floods the top.",
         "weights": {"w_quality":0.05,"w_popularity":0.4,"w_recency":0.2,"w_diversity":0.05,"w_engagement":0.8}},
        {"id": "editorial", "title": "Editorial Quality Filter",
         "emoji": "📰", "platform": "The Economist / Substack",
         "desc": "Quality-gated ranking. Only high-quality content surfaces regardless of engagement.",
         "risk": "Low reach for new creators. Niche but credible.",
         "weights": {"w_quality":0.9,"w_popularity":0.1,"w_recency":0.3,"w_diversity":0.3,"w_engagement":0.1}},
        {"id": "diversity_boost", "title": "Diversity Boost",
         "emoji": "🌍", "platform": "Public Broadcasting / EU Mandated",
         "desc": "Penalizes category concentration. Forces exposure across underrepresented topics.",
         "risk": "May surface low-engagement content. User retention risk.",
         "weights": {"w_quality":0.4,"w_popularity":0.1,"w_recency":0.2,"w_diversity":0.9,"w_engagement":0.2}},
        {"id": "trending", "title": "Trending / Recency First",
         "emoji": "⚡", "platform": "Twitter/X / Google News",
         "desc": "News-feed style. Freshness dominates, quality and diversity are secondary.",
         "risk": "Promotes sensationalism. Quality decays with age.",
         "weights": {"w_quality":0.2,"w_popularity":0.5,"w_recency":0.9,"w_diversity":0.1,"w_engagement":0.3}},
        {"id": "balanced", "title": "Balanced Default",
         "emoji": "⚖️", "platform": "Netflix / Spotify",
         "desc": "Equal weighting across all signals. Platform-neutral baseline.",
         "risk": "Jack of all trades, master of none.",
         "weights": {"w_quality":0.5,"w_popularity":0.3,"w_recency":0.2,"w_diversity":0.2,"w_engagement":0.4}},
    ]}


@app.get("/api/feedback-loop")
def get_feedback_loop(clicks: str = ""):
    click_counts: dict = {}
    if clicks:
        for item_id in clicks.split(","):
            if item_id:
                click_counts[item_id] = click_counts.get(item_id, 0) + 1

    df = df_items.copy()
    df["click_count"]        = df["id"].map(lambda x: click_counts.get(x, 0))
    df["click_boost"]        = df["click_count"] * 0.09
    df["boosted_popularity"] = (df["base_popularity"] + df["click_boost"]).clip(0, 1)
    df["composite_score"]    = (0.25 * df["quality_score"] + 0.75 * df["boosted_popularity"]).round(4)
    df["rank"]               = df["composite_score"].rank(ascending=False).astype(int)
    df = df.sort_values("rank")

    popularity_gap = round(float(df["boosted_popularity"].max() - df["boosted_popularity"].min()), 3)
    gini = _gini(df["composite_score"].values)

    return {
        "items":            df[["id","title","category","composite_score","boosted_popularity","rank","click_boost","click_count"]].to_dict(orient="records"),
        "popularity_gap":   popularity_gap,
        "gini_coefficient": round(gini, 3),
        "total_clicks":     sum(click_counts.values()),
    }


def _gini(arr: np.ndarray) -> float:
    arr = np.sort(arr)
    n = len(arr)
    index = np.arange(1, n + 1)
    return float((2 * (index * arr).sum() / (n * arr.sum())) - (n + 1) / n)


@app.get("/api/download-sample")
def download_sample():
    df = compute_scores(0.5, 0.3, 0.2, 0.2, 0.4)
    return {
        "sample_data": df[["id","title","category","source","quality_score",
                           "base_popularity","composite_score","rank"]].to_dict(orient="records")
    }


@app.get("/api/stats")
def get_stats():
    df = compute_scores(0.5, 0.3, 0.2, 0.2, 0.4)
    return {
        "total_items":    len(df),
        "total_users":    100,
        "avg_quality":    round(float(df["quality_score"].mean()), 3),
        "categories":     len(CATEGORIES),
        "owid_signal":    OWID_SIGNAL,
        "gdelt_signal":   GDELT_DATA,
        "category_stats": query_category_stats(),
    }
