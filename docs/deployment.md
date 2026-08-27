# Deployment Guide

> **This is a research prototype and not approved for clinical diagnosis.**
> Do not point these deployments at real patient data.

## 0. Prerequisites

- Node ≥ 18.17 (Next.js 14 requirement)
- Python ≥ 3.10
- A GitHub account (for Vercel integration)
- A Hugging Face account (for the inference Space)
- Optional: Supabase project, LLM API key

---

## A. Local development

```bash
# Terminal 1 — inference service
cd inference-service
python -m venv .venv && source .venv/bin/activate    # Win: .venv\Scripts\activate
pip install -r requirements.txt
pip install onnx && python scripts/make_dummy_onnx.py --all   # dummy smoke-test weights
uvicorn app:app --reload --port 8000

# Terminal 2 — web app
cd web-app
npm ci
cp .env.example .env.local
# edit .env.local: INFERENCE_API_URL=http://127.0.0.1:8000
npm run dev
```

Open http://localhost:3000 → Upload page → analyze a sample PNG.

---

## B. Vercel (web app)

1. Push the repository to GitHub.
2. In Vercel: **Add New → Project → Import** your repo.
3. Set **Root Directory** to `web-app`.
4. Framework preset auto-detects **Next.js**; leave build settings default.
5. Add Environment Variables (Project → Settings → Environment Variables):

   | Key | Example | Notes |
   |---|---|---|
   | `INFERENCE_API_URL` | `https://your-space-xyz.hf.space` | set after step C |
   | `INFERENCE_TIMEOUT_MS` | `45000` | optional |
   | `SUPABASE_URL` | `https://xxx.supabase.co` | optional |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | server-side only, optional |
   | `LLM_API_KEY` / `LLM_BASE_URL` / `MODEL_NAME` | — | optional LLM extraction |

6. Deploy. Verify `https://<app>.vercel.app/api/health`.

### Vercel constraints worth knowing

- **Request body limit ≈ 4.5 MB** on serverless functions. This app enforces a
  stricter 4 MB-per-file client+server limit with clear error messages. For
  larger scans, downscale locally first (a roadmap item is direct-to-Space
  uploads from the browser).
- **Function duration:** Hobby plans allow up to 60 s per invocation
  (`maxDuration = 60` is already set on `/api/analyze`). Cold-started HF Spaces
  can take longer on the very first request — keep the Space warm or retry once.
- **Ephemeral filesystem:** without Supabase configured, cases persist only in
  the function instance's memory plus the browser's `sessionStorage`. That is
  intentional MVP behavior and labeled as such in the UI.

---

## C. Hugging Face Space (inference service)

The service ships as a Docker Space (`app_port: 7860`).

1. hf.co → **New Space** → name it e.g. `medvision-inference`.
2. SDK: **Docker** · License: MIT · Visibility: Public (private Spaces cannot
   be called from Vercel without auth tokens).
3. Clone the empty Space repo and copy the service in:

```bash
git clone https://huggingface.co/spaces/<you>/medvision-inference
cd medvision-inference
cp -r /path/to/medvision-agent/inference-service/* .
git add . && git commit -m "MedVision inference service" && git push
```

4. The Space builds (~2–3 min first time). Check `https://<you>-medvision-inference.hf.space/health`.
   You should see `"mockPredictions": true` until you upload trained weights.
5. **Upload real weights** (TODO — train via `training/`):

```bash
git lfs install
git lfs track "*.onnx"
cp brain_unet.onnx lung_unet.onnx pancreas_unet.onnx models/
git add models/ && git commit -m "Add trained ONNX weights" && git push
```

6. Back in Vercel, set `INFERENCE_API_URL=https://<you>-medvision-inference.hf.space`
   and redeploy.

### Notes

- Free CPU Spaces sleep after ~48 h idle; the first request after sleep may add
  20–60 s latency. Ping `/health` on a schedule if this annoys you.
- Set env var `MOCK_PREDICTIONS=0` in the Space settings once real weights are
  deployed so missing models become hard errors instead of synthetic masks.
- `MODELS_DIR` defaults to `./models` inside the container.
- `ALLOWED_ORIGINS` defaults to `http://localhost:3000`. Add a comma-separated
  allow-list only if a browser will call the Space directly; the normal Vercel
  route calls it server-to-server.

---

## D. Supabase (optional persistence)

1. Create a project at supabase.com (free tier is sufficient).
2. SQL Editor → paste [`supabase/schema.sql`](../supabase/schema.sql) → Run.
3. Get `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API.
4. Add both to Vercel env vars → redeploy.

The service-role key bypasses RLS by design and must stay server-side; the
schema enables RLS with no public policies so anon users see nothing.

---

## E. Training artifacts

Follow [`training/README.md`](../training/README.md) on Kaggle or Colab:

```
best.pt(h) checkpoint → torch.onnx.export → <organ>_unet.onnx
                      → git lfs push to the Space's models/ dir
```

Input contract expected by the service: single-channel grayscale,
`1×1×256×256` float32, min-max normalized per slice; output: `1×1×256×256`
logits (sigmoid applied by the service if needed).
