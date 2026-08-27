"""Visualization helpers: overlay compositing and grayscale echo previews.

RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

from .postprocessing import LESION_RGB, png_base64


def grayscale_png_base64(arr01: np.ndarray) -> str:
    """[0,1] 2-D array → base64 PNG (for echoing the analyzed slice)."""
    img = Image.fromarray(np.clip(arr01 * 255.0, 0, 255).astype(np.uint8), mode="L")
    return png_base64(img)


def contour_mask(binary: np.ndarray) -> np.ndarray:
    """1-px boundary of the mask. scipy erosion when available, else shift-diff."""
    b = binary.astype(bool)
    try:
        from scipy import ndimage

        eroded = ndimage.binary_erosion(b, structure=np.ones((3, 3)))
        return (b ^ eroded).astype(np.uint8)
    except ImportError:
        out = np.zeros_like(b, dtype=np.uint8)
        # cheap boundary via neighbor disagreement
        up = np.zeros_like(b); up[1:, :] = b[:-1, :]
        down = np.zeros_like(b); down[:-1, :] = b[1:, :]
        left = np.zeros_like(b); left[:, 1:] = b[:, :-1]
        right = np.zeros_like(b); right[:, :-1] = b[:, 1:]
        edge = b ^ up | b ^ down | b ^ left | b ^ right
        out[edge] = 1
        return out


def overlay_png_base64(base01: np.ndarray, binary: np.ndarray, alpha: float = 0.45) -> str:
    """Composite: grayscale slice + translucent red lesion + bright outline."""
    h, w = base01.shape
    g = np.clip(base01 * 255.0, 0, 255).astype(np.uint8)

    rgb = np.stack([g, g, g], axis=-1).astype(np.float32)

    m = binary.astype(bool)
    color = np.array(LESION_RGB, dtype=np.float32)
    rgb[m] = rgb[m] * (1.0 - alpha) + color * alpha

    edge = contour_mask(binary).astype(bool)
    rgb[edge] = [255, 210, 60]  # amber outline for visibility

    img = Image.fromarray(rgb.astype(np.uint8), mode="RGB")
    return png_base64(img)


def synthetic_mask(
    organ: str,
    seed_bytes: bytes,
    width: int,
    height: int,
) -> tuple[np.ndarray, float]:
    """Deterministic wobbly-ellipse mask for demo mode (no trained weights).

    Returns (binary mask, placeholder confidence). Same upload ⇒ same output.
    """
    import hashlib

    digest = hashlib.sha256(seed_bytes).digest()
    seed = int.from_bytes(digest[:8], "big")
    rng = np.random.default_rng(seed)

    presets = {
        "brain": (0.52, 0.44, 0.075, 0.09, 2),
        "lung": (0.38, 0.34, 0.065, 0.07, 3),
        "pancreas": (0.55, 0.58, 0.10, 0.055, 4),
    }
    cx_f, cy_f, rx_f, ry_f, wobble = presets.get(organ, presets["lung"])

    cx = width * (cx_f + (rng.random() - 0.5) * 0.08)
    cy = height * (cy_f + (rng.random() - 0.5) * 0.08)
    rx = width * rx_f * (0.8 + rng.random() * 0.5)
    ry = height * ry_f * (0.8 + rng.random() * 0.5)
    phase = rng.random() * 2.0 * np.pi

    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    theta = np.arctan2(ys - cy, xs - cx)
    wob = (
        1.0
        + 0.22 * np.sin(theta * wobble + phase)
        + 0.10 * np.sin(theta * (wobble + 3))
    )
    nx = (xs - cx) / (rx * wob)
    ny = (ys - cy) / (ry * wob)
    binary = ((nx * nx + ny * ny) <= 1.0).astype(np.uint8)

    confidence = round(float(0.42 + rng.random() * 0.28), 3)
    return binary, confidence
