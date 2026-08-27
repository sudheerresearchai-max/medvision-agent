"""
MedVision Agent — Inference Service (FastAPI + ONNX Runtime).

RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.

Endpoints
---------
GET  /health   : model availability, runtime info, disclaimer.
POST /predict  : multipart {file, organ[, slice_index, threshold, return_overlay]}
                 → base64 PNG mask + JSON metrics + placeholder confidence.

Design notes
------------
- One lightweight 2-D U-Net per organ (brain/lung/pancreas), CPU only.
- Missing weights degrade to deterministic SYNTHETIC masks when
  MOCK_PREDICTIONS != "0" (default) so demos never break; responses are loudly
  flagged. Set MOCK_PREDICTIONS=0 in production to hard-fail instead.
- All inputs are resized to a single 256×256 grayscale slice (see utils/).
"""

from __future__ import annotations

import os
import threading
import time
from pathlib import Path
from typing import Optional

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from utils.postprocessing import (
    close_small_holes,
    compute_metrics,
    confidence_placeholder,
    largest_component,
    mask_png_base64,
    sigmoid,
    to_binary,
)
from utils.preprocessing import (
    SUPPORTED_EXTENSIONS,
    apply_organ_window,
    load_array,
    prepare_input,
)
from utils.visualization import overlay_png_base64, synthetic_mask

DISCLAIMER = "This is a research prototype and not approved for clinical diagnosis."
MODEL_INPUT_SIZE = 256
MAX_UPLOAD_BYTES = 20 * 1024 * 1024

ORGANS = ("brain", "lung", "pancreas")
MODEL_FILES = {
    "brain": "brain_unet.onnx",
    "lung": "lung_unet.onnx",
    "pancreas": "pancreas_unet.onnx",
}

MODELS_DIR = Path(
    os.environ.get("MODELS_DIR", str(Path(__file__).resolve().parent / "models"))
)
MOCK_ENABLED = os.environ.get("MOCK_PREDICTIONS", "1") != "0"
# The Next.js backend calls this service server-to-server, so no browser origin
# is needed in production.  Local development can opt in through this list.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app = FastAPI(
    title="MedVision Agent Inference Service",
    version="0.1.0",
    description=f"ONNX 2-D U-Net inference for brain/lung/pancreas scans. {DISCLAIMER}",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# ONNX session registry (lazy, thread-safe)
# ---------------------------------------------------------------------------

_session_lock = threading.Lock()
_sessions: dict[str, dict] = {}  # organ -> {"session","input","expects_rgb"}


def get_session(organ: str) -> Optional[dict]:
    """Load & cache the ONNX session for an organ, or None when weight missing."""
    with _session_lock:
        if organ in _sessions:
            return _sessions[organ]

        path = MODELS_DIR / MODEL_FILES[organ]
        if not path.is_file():
            return None

        opts = ort.SessionOptions()
        opts.log_severity_level = 3  # keep Space logs clean
        session = ort.InferenceSession(
            str(path), sess_options=opts, providers=["CPUExecutionProvider"]
        )
        inp = session.get_inputs()[0]
        shape = inp.shape or []
        # Some exports expect RGB (shape[1]==3); our tensors are grayscale.
        expects_rgb = isinstance(shape[1], int) and shape[1] == 3

        _sessions[organ] = {
            "session": session,
            "input_name": inp.name,
            "expects_rgb": expects_rgb,
        }
        return _sessions[organ]


def run_model(meta: dict, x: np.ndarray) -> np.ndarray:
    """1×1×H×W tensor → 2-D probability map (sigmoid applied when needed)."""
    tensor = np.repeat(x, 3, axis=1) if meta["expects_rgb"] else x
    logits = meta["session"].run(None, {meta["input_name"]: tensor})[0]
    out2d = np.squeeze(logits)
    if out2d.ndim != 2:  # defensive squeeze for exotic exports
        out2d = out2d.reshape(out2d.shape[-2:])
    lo, hi = float(out2d.min()), float(out2d.max())
    return sigmoid(out2d) if (lo < 0.0 or hi > 1.0) else out2d.astype(np.float32)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "service": "MedVision Agent inference",
        "version": app.version,
        "endpoints": ["/health", "/predict"],
        "organs": list(ORGANS),
        "mockPredictions": MOCK_ENABLED,
        "disclaimer": DISCLAIMER,
    }


@app.get("/health")
def health():
    models = {}
    for organ in ORGANS:
        exists = (MODELS_DIR / MODEL_FILES[organ]).is_file()
        loaded = organ in _sessions
        models[organ] = {
            "file": MODEL_FILES[organ],
            "present": exists,
            "loaded": loaded,
            "mode": "onnx" if exists else ("mock" if MOCK_ENABLED else "unavailable"),
        }
    return {
        "status": "ok" if all(m["present"] for m in models.values()) or MOCK_ENABLED else "degraded",
        "models": models,
        "modelsDir": str(MODELS_DIR),
        "mockPredictions": MOCK_ENABLED,
        "onnxRuntimeVersion": ort.__version__,
        "disclaimer": DISCLAIMER,
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    organ: str = Form(...),
    slice_index: Optional[int] = Form(default=None),
    threshold: float = Form(default=0.5),
    return_overlay: bool = Form(default=True),
):
    t0 = time.perf_counter()

    # ---- Validate request ---------------------------------------------------
    if organ not in ORGANS:
        raise HTTPException(status_code=400, detail=f"organ must be one of {ORGANS}.")
    threshold = float(np.clip(threshold, 0.05, 0.95))

    filename = file.filename or "scan"
    if not filename.lower().endswith(tuple(SUPPORTED_EXTENSIONS)):
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported scan type '{filename}'. "
                f"Supported: {', '.join(SUPPORTED_EXTENSIONS)}."
            ),
        )

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Scan exceeds 20 MB service cap.")

    # ---- Preprocess -----------------------------------------------------------
    try:
        raw2d, spacing_mm, notes = load_array(data, filename, slice_index)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:  # unreadable DICOM/NIfTI etc.
        raise HTTPException(
            status_code=400,
            detail=f"Could not decode '{filename}' ({type(err).__name__}: {err}).",
        )

    normalized = apply_organ_window(raw2d, organ)
    tensor = prepare_input(normalized, MODEL_INPUT_SIZE)

    # ---- Inference (real model or deterministic synthetic fallback) ------------
    warnings: list[str] = list(notes)
    engine = "onnx"
    synthetic = False
    meta = get_session(organ)

    if meta is None:
        if not MOCK_ENABLED:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Model '{MODEL_FILES[organ]}' not found in {MODELS_DIR} "
                    "and MOCK_PREDICTIONS=0. Deploy trained weights first."
                ),
            )
        binary, placeholder_conf = synthetic_mask(organ, data, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)
        prob = binary.astype(np.float32) * max(placeholder_conf, 0.01)
        engine = "mock"
        synthetic = True
        warnings.append(
            f"SYNTHETIC DEMO OUTPUT — '{MODEL_FILES[organ]}' missing; deterministic mock used."
        )
    else:
        prob = run_model(meta, tensor)
        binary = to_binary(prob, threshold)
        binary = close_small_holes(largest_component(binary))

    # ---- Postprocess & package -------------------------------------------------
    metrics = compute_metrics(binary)
    processing_ms = int((time.perf_counter() - t0) * 1000)

    response = {
        "success": True,
        "organ": organ,
        "model": MODEL_FILES[organ],
        "engine": engine,
        "width": MODEL_INPUT_SIZE,
        "height": MODEL_INPUT_SIZE,
        "maskPngBase64": mask_png_base64(binary),
        "overlayPngBase64": (
            overlay_png_base64(tensor[0, 0], binary) if return_overlay else None
        ),
        "metrics": metrics,
        # PLACEHOLDER value — uncalibrated, no clinical meaning.
        "confidence": (
            placeholder_conf if synthetic else confidence_placeholder(prob, binary)
        ),
        "spacingMm": float(spacing_mm) if spacing_mm else None,
        "warnings": warnings,
        "processingMs": processing_ms,
        "threshold": threshold,
        "disclaimer": DISCLAIMER,
    }
    return JSONResponse(response)


# ---------------------------------------------------------------------------
# Global error handler — always JSON, never HTML stack traces
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "detail": f"Internal inference error: {type(exc).__name__}. See server logs.",
            "disclaimer": DISCLAIMER,
        },
    )
