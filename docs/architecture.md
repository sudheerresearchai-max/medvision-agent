# Architecture

> **This is a research prototype and not approved for clinical diagnosis.**
> The architecture below is designed for learning agentic orchestration
> patterns around medical-imaging models — not for clinical deployment.

## 1. High-level topology

```
                        ┌──────────────────────────────────────────────┐
                        │                 Browser (Client)             │
                        │  Next.js App Router · React · Tailwind       │
                        │  /upload  /case/[id]  /docs                  │
                        └──────────────┬───────────────────────────────┘
                                       │ multipart POST (≤4 MB/part)
                        ┌──────────────▼───────────────────────────────┐
                        │        Vercel Serverless (Node.js)           │
                        │  /api/upload   /api/analyze   /api/health    │
                        │                                              │
                        │  lib/agent.ts  ← the agent orchestrator      │
                        │    validateImage / validatePdf               │
                        │    extractPdfText (pdfjs-dist)               │
                        │    extractClinicalInfo (rules + optional LLM)│
                        │    detectOrganAndModality → routeToModel     │
                        │    runBrainModel | runLungModel | ...        │
                        │    postprocessMask → calculateMeasurements   │
                        │    generateStructuredReport                  │
                        │    addSafetyWarnings                         │
                        └───────┬─────────────────────────┬────────────┘
                                │ HTTPS JSON (base64 PNG) │ optional
                 ┌──────────────▼───────────┐   ┌─────────▼──────────────┐
                 │  Hugging Face Space      │   │  Supabase (optional)   │
                 │  FastAPI + ONNX Runtime  │   │  cases/jobs/results/   │
                 │  brain/lung/pancreas U-Net│  │  reports               │
                 └──────────────────────────┘   └────────────────────────┘
```

Design rule: **Vercel does light work only** (validation, text extraction,
routing, report assembly). All tensor math lives in the FastAPI service so the
web tier stays inside free-tier CPU/time limits.

## 2. Agent workflow

Every run produces an `AgentStep[]` trace that the UI renders verbatim, making
the pipeline inspectable and debuggable. Each tool is an isolated function with
a defined failure mode; failures degrade gracefully instead of aborting when
safe to do so.

| # | Tool                       | Responsibility                                            | On failure |
|---|----------------------------|-----------------------------------------------------------|------------|
| 1 | `validateImage()`          | Extension/mime/size checks (.png .jpg .jpeg .dcm .nii .nii.gz ≤4 MB) | hard stop if invalid |
| 2 | `validatePdf()`            | PDF magic bytes, size cap                                  | hard stop if invalid |
| 3 | `extractPdfText()`         | pdfjs-dist text extraction; scanned detection → `OCR_REQUIRED` | warn, continue |
| 4 | `extractClinicalInfo()`    | Rule-based NLP; optional LLM merge behind `LLM_API_KEY`    | warn, continue |
| 5 | `detectOrganAndModality()` | Fuses manual selector > clinical text > PDF > filenames    | mark unknown |
| 6 | `routeToModel()`           | Routing matrix below; records assumptions                  | ask for manual pick |
| 7–9| `runBrainModel()` / `runLungModel()` / `runPancreasModel()` | Thin wrappers over `inferenceClient` | hard stop |
| 10| `postprocessMask()`        | Normalizes service payload, validates mask PNG             | warn |
| 11| `calculateMeasurements()`  | Pixel-space metrics (+ mm when spacing available)          | warn |
| 12| `generateStructuredReport()`| Deterministic markdown report builder                     | never throws |
| 13| `addSafetyWarnings()`      | Appends research-only + context-specific warnings          | never throws |

### Routing matrix

| Organ detected | Modality detected | Action                          |
|----------------|-------------------|---------------------------------|
| brain          | MRI               | → `brain_unet.onnx`             |
| lung           | CT                | → `lung_unet.onnx`              |
| pancreas       | CT or MRI         | → `pancreas_unet.onnx`          |
| organ known    | modality unknown  | apply organ default (brain→MRI, lung→CT, pancreas→CT) **flagged as assumption** |
| organ known    | mismatched modality | run organ model anyway, attach warning |
| unknown        | any               | UI asks for manual selection    |

Priority order for organ detection: explicit user selector → clinical text
keywords → PDF text keywords → filename hints.

## 3. Inference contract

`POST {INFERENCE_API_URL}/predict` (multipart):
`file=<scan bytes>`, `organ=brain|lung|pancreas`, optional `slice_index`,
`threshold`, `return_overlay`.

Response (all fields JSON-safe):

```jsonc
{
  "success": true,
  "organ": "lung",
  "model": "lung_unet.onnx",
  "width": 256, "height": 256,
  "maskPngBase64": "iVBORw0KG...",      // RGBA: red lesion on transparent bg
  "overlayPngBase64": "iVBORw0KG...",   // composite over the preprocessed slice
  "metrics": {
    "areaPx": 512, "areaFraction": 0.0078,
    "bbox": {"x": 96, "y": 88, "w": 40, "h": 36},
    "centroid": {"x": 116.2, "y": 106.9},
    "equivalentDiameterPx": 25.5
  },
  "confidence": 0.61,                   // PLACEHOLDER — not calibrated
  "spacingMm": null,                    // set when DICOM/NIfTI spacing known
  "warnings": ["..."],
  "processingMs": 84,
  "disclaimer": "This is a research prototype and not approved for clinical diagnosis."
}
```

If a model weight is missing and `MOCK_PREDICTIONS != 0`, the Space returns a
**synthetic deterministic mask** with a loud warning. The web app has its own
independent mock engine for the same reason.

## 4. Data & storage

- **No-database mode (default):** cases live in a per-instance memory store
  (TTL 24 h) and are mirrored into browser `sessionStorage`, so the result page
  survives serverless instance churn in the common same-browser flow.
- **Supabase mode:** set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; rows are
  written to `cases`, `jobs`, `results`, `reports` per `supabase/schema.sql`.
  Service-role key is used exclusively server-side.

## 5. Key design decisions

- **2-D slicing instead of 3-D volumes:** keeps models tiny (<1 M params),
  trainable on free Kaggle/Colab GPUs, servable on free HF Spaces CPU.
- **Base64 PNG masks** instead of binary blobs: renders anywhere, diffable,
  no client-side decode logic.
- **Explicit agent trace** instead of hidden chaining: every step's status,
  duration and detail are surfaced in the UI — good pedagogy and good debugging.
- **Graceful degradation everywhere:** missing weights → synthetic demo masks;
  missing DB → memory store; missing LLM key → rules only; scanned PDF →
  `OCR_REQUIRED` flag rather than silent empty text.
