# PoC #49 — Recommendation Engine Sandbox

**Rail:** Distribution & Demand
**Style:** Cinematic Rail (slate-cyan, 100% stage, slide-over panel)

## Run

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # optional: add GDELT / OWID URLs
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## Architecture

- **Backend** (FastAPI + Pandas + DuckDB): live GDELT/OWID pipeline + synthetic 100-user × 24-item interaction matrix
- **Frontend** (Next.js 14 + Tailwind): 5 tabs — Preference Sliders, Score View, Bias Loop, Outcomes, Scenarios
- **Slide-over Intel Panel** triggered by edge handle (right side), click on stage, or `i` key
- **Architect modal** opens from the (i) button in the header
