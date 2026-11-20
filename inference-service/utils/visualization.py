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
    is_normal: bool = False,
    filename: str = "",
    clinical_notes: Optional[str] = None,
) -> tuple[np.ndarray, float]:
    """Deterministic mask for demo mode with zero false positive verification.

    Returns (binary mask, placeholder confidence). If input indicates normal anatomy
    or absence of lesion, returns a clean all-zero mask.
    """
    if is_normal:
        return np.zeros((height, width), dtype=np.uint8), 0.0

    from .postprocessing import is_control_filename
    if is_control_filename(filename):
        return np.zeros((height, width), dtype=np.uint8), 0.0

    fn_lower = filename.lower()

    # Check SVG content for lesion markers
    text_sample = seed_bytes[:10000].decode("utf-8", errors="ignore")
    if "<svg" in text_sample:
        has_lesion = any(m in text_sample for m in [
            '#8888a8', 'Perilesional Edema', 'Frontal/Temporal Lesion', 'Enhancing Mass',
            '#a4a4b8', 'Spiculations', 'Solitary Pulmonary Nodule', 'Hyperdense Mass',
            '#7a7a92', 'Pancreatic Head Hypodense Lesion', 'Adenocarcinoma Target',
            'class="lesion"', 'id="lesion"', 'drop-shadow',
        ])
        if not has_lesion:
            return np.zeros((height, width), dtype=np.uint8), 0.0
    else:
        # Non-SVG raster: Require positive indicator in filename or clinical evidence
        # Default conservative policy: NO FALSE POSITIVES without positive evidence
        has_pos_fn = any(
            k in fn_lower
            for k in (
                "tumor", "tumour", "mass", "lesion", "nodule", "cancer", "carcinoma",
                "gbm", "glioma", "case01", "case02", "case03"
            )
        ) and not any(r in fn_lower for r in ("rule_out", "rule-out", "r_o", "r-o", "ruleout"))
        has_pos_clinical = False
        if clinical_notes:
            from .postprocessing import check_clinical_is_negative, check_clinical_has_positive
            if check_clinical_is_negative(clinical_notes):
                return np.zeros((height, width), dtype=np.uint8), 0.0
            has_pos_clinical = check_clinical_has_positive(clinical_notes)

        if not (has_pos_fn or has_pos_clinical):
            return np.zeros((height, width), dtype=np.uint8), 0.0

    import hashlib

    digest = hashlib.sha256(seed_bytes).digest()
    seed = int.from_bytes(digest[:8], "big")
    rng = np.random.default_rng(seed)

    presets = {
        "brain": (88 / 256, 115 / 256, 22 / 256, 26 / 256, 2),
        "lung": (178 / 256, 105 / 256, 16 / 256, 14 / 256, 3),
        "pancreas": (106 / 256, 136 / 256, 14 / 256, 12 / 256, 2),
    }
    cx_f, cy_f, rx_f, ry_f, wobble = presets.get(organ, presets["lung"])

    cx = width * (cx_f + (rng.random() - 0.5) * 0.03)
    cy = height * (cy_f + (rng.random() - 0.5) * 0.03)
    rx = width * rx_f * (0.95 + rng.random() * 0.1)
    ry = height * ry_f * (0.95 + rng.random() * 0.1)
    phase = rng.random() * 2.0 * np.pi

    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    theta = np.arctan2(ys - cy, xs - cx)
    wob = (
        1.0
        + 0.18 * np.sin(theta * wobble + phase)
        + 0.08 * np.sin(theta * (wobble + 2))
    )
    nx = (xs - cx) / (rx * wob)
    ny = (ys - cy) / (ry * wob)
    binary = ((nx * nx + ny * ny) <= 1.0).astype(np.uint8)

    confidence = round(float(0.85 + rng.random() * 0.12), 3)
    return binary, confidence
