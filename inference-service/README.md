---
title: MedVision Inference
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# MedVision Agent — Inference Service

> **This is a research prototype and not approved for clinical diagnosis.**

FastAPI + ONNX Runtime service exposing three lightweight 2-D U-Nets:

| Organ    | Model file                   | Reference training data |
| -------- | ---------------------------- | ----------------------- |
| Brain    | `models/brain_unet.onnx`    | BraTS (weights TBD)     |
| Lung     | `models/lung_unet.onnx`     | LUNA16 / MSD T06 (TBD)  |
| Pancreas | `models/pancreas_unet.onnx` | MSD Task07 (TBD)        |

## Endpoints

- `GET /health` — model availability, mock flag, disclaimer.
- `POST /predict` — multipart: `file` (scan), `organ` (brain|lung|pancreas),
  optional `slice_index`, `threshold`, `return_overlay`.

Until real weights are uploaded, missing models fall back to **deterministic
synthetic masks** (`MOCK_PREDICTIONS=1`, the default). Set it to `0` to turn
missing weights into hard errors.

## Local run

```bash
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MODELS_DIR` | `./models` | Directory containing the three ONNX weights. |
| `MOCK_PREDICTIONS` | `1` | Set to `0` to fail when a trained weight is missing. |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allow-list for direct browser access. The standard web app calls the service server-to-server. |

## Weights workflow

Train via the `training/` notebooks → export ONNX → `git lfs push` into
`models/` (see repo docs/deployment.md). Expected I/O contract:
input `1×1×256×256` float32 (grayscale, min-max normalized), output
`1×1×256×256` logits or probabilities.
