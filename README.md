# MedVision Agent

**Multi-Model Agentic AI for Brain, Lung, and Pancreatic Tumor Analysis**

> ⚠️ **MEDICAL DISCLAIMER — READ FIRST**
>
> **This is a research prototype and not approved for clinical diagnosis.**
> MedVision Agent is an educational/research system for exploring agentic
> orchestration around lightweight tumor-segmentation models. It must never be
> used to make decisions about real patients. See [`docs/safety.md`](docs/safety.md).

MedVision Agent accepts three input types — a medical scan image, free-text
clinical information, and/or a radiology report PDF — and runs them through an
explicit, inspectable **agent workflow**:

```
Input → validation → PDF/text extraction → organ/modality routing
      → tumor model inference → postprocessing → measurement
      → structured report generation → safety warnings
```

Three interchangeable lightweight 2-D U-Net heads are routed by organ/modality:

| Organ    | Modality | Model                | Reference datasets            |
| -------- | -------- | -------------------- | ----------------------------- |
| Brain    | MRI      | `brain_unet.onnx`    | BraTS                         |
| Lung     | CT       | `lung_unet.onnx`     | LUNA16 / LIDC-IDRI / MSD T06  |
| Pancreas | CT/MRI   | `pancreas_unet.onnx` | MSD Task07 Pancreas           |

Unknown organ/modality falls back to **manual user selection**.

---

## Repository layout

```text
medvision-agent/
├── docs/                  # architecture, deployment, safety
├── web-app/               # Next.js 14 frontend + API routes (Vercel)
├── inference-service/     # FastAPI + ONNX Runtime (Hugging Face Space)
├── training/              # Kaggle/Colab training notebook templates
└── supabase/schema.sql    # optional persistence schema
```

Full annotated tree lives in [`docs/architecture.md`](docs/architecture.md).

---

## Components

| Layer             | Tech                                                       | Runs where                |
| ----------------- | ---------------------------------------------------------- | ------------------------- |
| Frontend          | Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui  | Vercel free tier          |
| Orchestration     | TypeScript agent router in Next.js API routes              | Vercel (light work only)  |
| Inference         | Python FastAPI + ONNX Runtime (CPU)                        | Hugging Face Space (free) |
| PDF/text          | pdfjs-dist server-side; rule-based clinical NLP; opt. LLM  | Vercel                    |
| Training          | PyTorch (+ optional MONAI), 2-D U-Net, Dice+BCE loss       | Kaggle / Colab GPUs       |
| Storage (opt.)    | Supabase (`cases`, `jobs`, `results`, `reports`)           | Supabase free tier        |

The app is fully functional **without a database**: cases persist to an
in-memory store plus browser `sessionStorage`, clearly labeled as ephemeral.

---

## Quickstart (local)

Prereqs: Node ≥ 18.17, Python ≥ 3.10.

### 1. Inference service (terminal 1)

```bash
cd inference-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Optional: generate untrained dummy weights so you can smoke-test end-to-end.
# Real trained weights are a TODO — see training/.
pip install onnx
python scripts/make_dummy_onnx.py --all

uvicorn app:app --reload --port 8000
# → http://127.0.0.1:8000/docs
```

### 2. Web app (terminal 2)

```bash
cd web-app
npm ci
cp .env.example .env.local          # then edit values
npm run dev
# → http://localhost:3000
```

Set at minimum:

```env
INFERENCE_API_URL=http://127.0.0.1:8000
```

If `INFERENCE_API_URL` is unset, the web app runs with a built-in
**mock inference engine** (synthetic masks) so UI development never blocks on
Python. Every mock response is loudly flagged as synthetic.

For a repeatable verification run after installing Python dependencies:

```bash
cd inference-service
python -m unittest discover -s tests -v
```

---

## Environment variables

Copy `web-app/.env.example` → `.env.local`. Never commit real keys.

| Variable                     | Required | Purpose                                            |
| ---------------------------- | -------- | -------------------------------------------------- |
| `INFERENCE_API_URL`          | no       | Base URL of the FastAPI inference Space            |
| `INFERENCE_TIMEOUT_MS`       | no       | Predict timeout (default 45000)                    |
| `SUPABASE_URL`               | no       | Enables persistent storage when set                |
| `SUPABASE_SERVICE_ROLE_KEY`  | no       | Server-side only. **Never expose to the browser.** |
| `SUPABASE_ANON_KEY`          | no       | Only if you add client-side reads later            |
| `LLM_API_KEY`                | no       | Enables LLM-based clinical extraction              |
| `LLM_BASE_URL`               | no       | OpenAI-compatible base URL                         |
| `MODEL_NAME`                 | no       | Chat model id for extraction                       |
| `OCR_ENABLED`                | no       | `1` attempts Tesseract OCR on scanned PDFs         |

Inference-service env (optional): `MODELS_DIR`, `MOCK_PREDICTIONS`,
`ALLOWED_ORIGINS` (a comma-separated allow-list for direct browser access).

---

## Deployment

- **Web app → Vercel:** [`docs/deployment.md#vercel`](docs/deployment.md#vercel-web-app)
- **Inference → Hugging Face Space:** [`docs/deployment.md#hugging-face-space`](docs/deployment.md#hugging-face-space-inference-service)
- **Training on Kaggle/Colab:** [`training/README.md`](training/README.md)

---

## Safety & scope

- Research/educational prototype. **Not a medical device. Not FDA/CE cleared.**
- Outputs are placeholders (confidence values are explicitly non-calibrated).
- Do not upload protected health information (PHI). Use de-identified data only.
- Full statement: [`docs/safety.md`](docs/safety.md).

## License

Code is MIT (see `LICENSE`). Datasets referenced by the training notebooks have
their own licenses — review each before use.
