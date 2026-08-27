"""Mask postprocessing & metric computation.

RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.

Thresholds logits/probabilities, cleans tiny artifacts, computes pixel-space
metrics, and encodes the RGBA lesion mask as base64 PNG (red on transparent).
"""

from __future__ import annotations

import base64
import io
import math
from collections import deque
from typing import Optional

import numpy as np
from PIL import Image

LESION_RGB = (248, 72, 72)  # matches web UI --lesion color (#f84848)


def sigmoid(x: np.ndarray) -> np.ndarray:
    """Numerically stable sigmoid."""
    out = np.empty_like(x, dtype=np.float64)
    pos = x >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-x[pos]))
    ex = np.exp(x[~pos])
    out[~pos] = ex / (1.0 + ex)
    return out


def to_binary(prob: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    return (prob >= threshold).astype(np.uint8)


def largest_component(binary: np.ndarray) -> np.ndarray:
    """Keep only the largest connected component (8-connectivity).

    Uses scipy.ndimage when available; falls back to a plain BFS so the service
    still works on minimal installs. 512² BFS is fast enough for this MVP.
    """
    try:
        from scipy import ndimage

        labels, n = ndimage.label(binary, structure=np.ones((3, 3), dtype=int))
        if n <= 1:
            return binary
        counts = np.bincount(labels.ravel())
        counts[0] = 0
        return (labels == counts.argmax()).astype(np.uint8)
    except ImportError:
        pass

    h, w = binary.shape
    visited = np.zeros_like(binary, dtype=bool)
    best_mask = np.zeros_like(binary, dtype=np.uint8)
    best_size = 0
    for y in range(h):
        for x in range(w):
            if binary[y, x] and not visited[y, x]:
                comp = np.zeros_like(binary, dtype=np.uint8)
                q = deque([(y, x)])
                visited[y, x] = True
                size = 0
                while q:
                    cy, cx = q.popleft()
                    comp[cy, cx] = 1
                    size += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx_ = cy + dy, cx + dx
                            if (
                                0 <= ny < h and 0 <= nx_ < w
                                and binary[ny, nx_]
                                and not visited[ny, nx_]
                            ):
                                visited[ny, nx_] = True
                                q.append((ny, nx_))
                if size > best_size:
                    best_size, best_mask = size, comp
    return best_mask if best_size > 0 else binary


def close_small_holes(binary: np.ndarray) -> np.ndarray:
    """One morphological closing iteration (optional nicety)."""
    try:
        from scipy import ndimage

        closed = ndimage.binary_closing(binary, structure=np.ones((3, 3)))
        return closed.astype(np.uint8)
    except ImportError:
        return binary  # graceful no-op without scipy


def compute_metrics(binary: np.ndarray) -> dict:
    """Pixel-space lesion metrics for the structured report."""
    area = int(binary.sum())
    h, w = binary.shape
    if area == 0:
        return {
            "areaPx": 0,
            "areaFraction": 0.0,
            "bbox": None,
            "centroid": None,
            "equivalentDiameterPx": None,
        }
    ys, xs = np.nonzero(binary)
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    bbox_w, bbox_h = x1 - x0 + 1, y1 - y0 + 1
    return {
        "areaPx": area,
        "areaFraction": round(area / float(h * w), 6),
        "bbox": {"x": x0, "y": y0, "w": bbox_w, "h": bbox_h},
        "centroid": {
            "x": round(float(xs.mean()), 1),
            "y": round(float(ys.mean()), 1),
        },
        "equivalentDiameterPx": round(2.0 * math.sqrt(area / math.pi), 1),
    }


def mask_to_rgba(binary: np.ndarray, color=LESION_RGB) -> np.ndarray:
    """Binary mask → RGBA uint8 (lesion color, transparent background)."""
    m = binary.astype(bool)
    rgba = np.zeros((*binary.shape, 4), dtype=np.uint8)
    rgba[..., 0][m] = color[0]
    rgba[..., 1][m] = color[1]
    rgba[..., 2][m] = color[2]
    rgba[..., 3][m] = 235
    return rgba


def png_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def mask_png_base64(binary: np.ndarray) -> str:
    rgba = mask_to_rgba(binary)
    img = Image.fromarray(rgba, mode="RGBA")
    return png_base64(img)


def confidence_placeholder(prob: np.ndarray, binary: np.ndarray) -> float:
    """Mean probability inside the predicted mask.

    EXPLICITLY A PLACEHOLDER: uncalibrated, not a probability of malignancy or
    of anything clinically meaningful. Documented as such end-to-end.
    """
    m = binary.astype(bool)
    if not m.any():
        return 0.0
    return round(float(np.mean(prob[m])), 3)
