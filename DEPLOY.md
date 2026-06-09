# Deploying PoC #49 to Render

Two services: a FastAPI backend and a Next.js frontend. You can deploy both at once
with the included `render.yaml` blueprint, or create them manually.

## Option A — Blueprint (easiest)

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo. It reads `render.yaml`
   and creates `poc49-backend` and `poc49-frontend`.
3. After the **backend** finishes deploying, copy its URL
   (e.g. `https://poc49-backend.onrender.com`).
4. On the **frontend** service → Environment, set:
   - `NEXT_PUBLIC_API_URL` = the backend URL from step 3
   Then **Manual Deploy → Clear build cache & deploy** (this value is baked in at
   build time, so the frontend must rebuild after you set it).
5. (Optional) On the **backend** service, set `ALLOWED_ORIGINS` to the frontend URL.
   Not strictly needed — any `*.onrender.com` origin is already allowed.

## Option B — Manual

**Backend** (Web Service, Python)
- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend** (Web Service, Node)
- Root directory: `frontend`
- Build: `npm install && npm run build`
- Start: `npm run start -- -p $PORT`
- Env: `NEXT_PUBLIC_API_URL` = backend URL (set before building)

## Notes

- **Free tier sleeps.** Both services spin down after ~15 min idle and take ~30–60s
  to wake on the next request. The first load after sleep will be slow.
- **NEXT_PUBLIC_API_URL is build-time.** If you change it, redeploy the frontend.
- **GDELT rate limits.** Live mode self-recovers: the backend retries the fetch
  (throttled to once / 20s) whenever the frontend polls, and the synthetic
  placeholder keeps the UI populated until real articles arrive.
