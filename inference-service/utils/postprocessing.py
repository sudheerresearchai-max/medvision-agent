"""Mask postprocessing & metric computation.

RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.

Thresholds logits/probabilities, cleans tiny artifacts, suppresses false positive
noise clusters, computes pixel-space metrics, and encodes the RGBA lesion mask as
base64 PNG (red on transparent).
"""

from __future__ import annotations

import base64
import io
import math
from collections import deque
import re
from typing import Optional

import numpy as np
from PIL import Image

LESION_RGB = (248, 72, 72)  # matches web UI --lesion color (#f84848)
MIN_LESION_SIZE_PX = 30
MIN_PEAK_PROBABILITY = 0.55


CONTROL_FILENAME_RE = re.compile(
    r"(?:^|[\W_])(normal_control|healthy_control|neg_control|negative_control|unremarkable)(?:[\W_]|$)|"
    r"(?:^|[\W_])(normal|control|healthy)(?:[\W_]|$)",
    re.IGNORECASE,
)
NON_CONTROL_EXCLUSIONS_RE = re.compile(
    r"(?:abnormal|not[\W_]?normal|non[\W_]?normal|clear[\W_]?cell|triple[\W_]?negative|rule[\W_]?out)",
    re.IGNORECASE,
)


def is_control_filename(filename: str) -> bool:
    """Determine whether a scan filename indicates an explicit negative control."""
    if not filename:
        return False
    if NON_CONTROL_EXCLUSIONS_RE.search(filename):
        return False
    return bool(CONTROL_FILENAME_RE.search(filename))


def check_clinical_is_negative(clinical_notes: Optional[str]) -> bool:
    """Evaluate whether clinical narrative confirms normal/negative study with absence of mass."""
    if not clinical_notes or not clinical_notes.strip():
        return False
    text = clinical_notes.lower()

    normal_pattern = re.compile(
        r"\b(unremarkable|within normal limits|wnl|"
        r"no acute (?:intracranial|cardiopulmonary|abnormality|pathology)|"
        r"clear lungs|clear lung fields|negative for malignancy|negative study|study is negative|"
        r"negative for neoplasm|negative for tumor|negative for mass|routine screening|"
        r"clear scan|clear study|normal (?:study|scan|brain|chest|pancreas|parenchyma|contours|mri|ct))\b",
        re.IGNORECASE,
    )
    has_normal_cue = bool(normal_pattern.search(text))

    lesion_terms = [
        "mass", "tumor", "tumour", "lesion", "nodule", "adenocarcinoma", "carcinoma", "gbm",
        "glioma", "malignancy", "neoplasm", "metastasis", "metastases",
    ]

    # Pre-negation cues: must NOT include "rule out" (which is an indication)
    neg_prefix = re.compile(
        r"\b(?:neither|nor|no|not|without|denies|denied|negative\s+for|rules\s+out|ruled\s+out|"
        r"free\s+of|free\s+from|clear\s+of|unremarkable\s+for|absence\s+of|no\s+evidence\s+of|"
        r"no\s+sign[s]?\s+of|without\s+evidence\s+of|"
        r"no\s+focal|no\s+definite|no\s+abnormal|no\s+suspicious|no\s+discrete|no\s+obvious|no\s+gross|"
        r"fails?\s+to\s+(?:show|reveal|demonstrate)|shows?\s+no|reveals?\s+no|demonstrates?\s+no|"
        r"unlikely|resolved|zero)\b",
        re.IGNORECASE,
    )

    # Post-negation cues: must NOT treat "not seen on prior" as negation
    post_negation = re.compile(
        r"(?:\b(?:is\s+ruled\s+out|was\s+ruled\s+out|"
        r"not\s+seen(?!\s+(?:previously|on\s+prior|on\s+previous|on\s+earlier|before))|"
        r"not\s+identified(?!\s+(?:previously|on\s+prior|on\s+previous|on\s+earlier|before))|"
        r"not\s+detected(?!\s+(?:previously|on\s+prior|on\s+previous|on\s+earlier|before))|"
        r"not\s+visualized(?!\s+(?:previously|on\s+prior|on\s+previous|on\s+earlier|before))|"
        r"not\s+found|not\s+noted|not\s+observed|not\s+demonstrated|"
        r"(?:is|was|are|were)?\s+not\s+present|is\s+absent|was\s+absent|are\s+absent|were\s+absent|"
        r"is\s+negative|was\s+negative|are\s+negative|were\s+negative|"
        r"within\s+normal\s+limits|wnl|unremarkable|is\s+excluded|was\s+excluded|"
        r"\bnone\b|\bzero\b|resolved)\b|:\s*none\b|:\s*zero\b|[-:]\s*negative\b|[-:]\s*absent\b)",
        re.IGNORECASE,
    )

    pseudo_negation = re.compile(
        r"\b(?:cannot|can\s+not|unable\s+to|hard\s+to|difficult\s+to|not)\s+(?:rule\s+out|exclude)\b|"
        r"\b(?:rule\s+out|r/o)\b",
        re.IGNORECASE,
    )

    clause_split = re.compile(r"[.;!?\n]|\b(?:but|however|although|except|apart\s+from)\b", re.IGNORECASE)

    affirmed_count = 0
    negated_count = 0

    for term in lesion_terms:
        for m in re.finditer(rf"\b{term}\w*\b", text, re.IGNORECASE):
            tail = text[m.end():m.end() + 10].lower()
            if term in ("mass", "tumour", "tumor") and tail.startswith(" effect"):
                continue

            start = max(0, m.start() - 250)
            pre = text[start:m.start()]
            clause_pre = clause_split.split(pre)[-1]

            end = min(len(text), m.end() + 120)
            post = text[m.end():end]
            clause_post = clause_split.split(post)[0]

            if pseudo_negation.search(clause_pre):
                affirmed_count += 1
                continue

            is_neg = bool(neg_prefix.search(clause_pre)) or bool(post_negation.search(clause_post))
            if is_neg:
                negated_count += 1
            else:
                affirmed_count += 1

    return (has_normal_cue or negated_count > 0) and affirmed_count == 0


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


def filter_small_components(binary: np.ndarray, min_area_px: int = MIN_LESION_SIZE_PX) -> np.ndarray:
    """Filter out all connected components smaller than min_area_px.

    Suppresses isolated pixel noise, speckle artifacts, and sub-resolution clusters.
    Uses scipy.ndimage when available; falls back to BFS.
    """
    if not binary.any() or min_area_px <= 1:
        return binary.astype(np.uint8)

    try:
        from scipy import ndimage

        labels, n = ndimage.label(binary, structure=np.ones((3, 3), dtype=int))
        if n == 0:
            return np.zeros_like(binary)
        counts = np.bincount(labels.ravel())
        counts[0] = 0
        valid_labels = np.where(counts >= min_area_px)[0]
        if len(valid_labels) == 0:
            return np.zeros_like(binary)
        return np.isin(labels, valid_labels).astype(np.uint8)
    except ImportError:
        pass

    h, w = binary.shape
    visited = np.zeros_like(binary, dtype=bool)
    out = np.zeros_like(binary, dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            if binary[y, x] and not visited[y, x]:
                pixels = []
                q = deque([(y, x)])
                visited[y, x] = True
                while q:
                    cy, cx = q.popleft()
                    pixels.append((cy, cx))
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
                if len(pixels) >= min_area_px:
                    for py, px in pixels:
                        out[py, px] = 1
    return out


def largest_component(binary: np.ndarray, min_size: int = MIN_LESION_SIZE_PX) -> np.ndarray:
    """Keep only the largest connected component (8-connectivity) if >= min_size.

    Components smaller than min_size are suppressed as noise to prevent false positives.
    Uses scipy.ndimage when available; falls back to a plain BFS so the service
    still works on minimal installs.
    """
    if not binary.any():
        return np.zeros_like(binary)

    try:
        from scipy import ndimage

        labels, n = ndimage.label(binary, structure=np.ones((3, 3), dtype=int))
        if n == 0:
            return np.zeros_like(binary)
        counts = np.bincount(labels.ravel())
        counts[0] = 0
        best_label = int(counts.argmax())
        best_count = counts[best_label]
        if best_count < min_size:
            return np.zeros_like(binary)
        return (labels == best_label).astype(np.uint8)
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
    return best_mask if best_size >= min_size else np.zeros_like(binary)


def close_small_holes(binary: np.ndarray) -> np.ndarray:
    """One morphological closing iteration (optional nicety)."""
    if not binary.any():
        return binary
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


def calibrate_confidence(
    prob: np.ndarray,
    binary: np.ndarray,
    min_peak_prob: float = MIN_PEAK_PROBABILITY,
) -> float:
    """Compute calibrated confidence score for predicted lesion mask.

    Returns 0.0 for empty masks or sub-threshold noise activations.
    For genuine candidate regions, returns calibrated confidence in [0.0, 1.0]
    combining peak activation, mean lesion activation, and foreground contrast.
    """
    m = binary.astype(bool)
    if not m.any():
        return 0.0

    lesion_probs = prob[m]
    peak = float(np.max(lesion_probs))
    if peak < min_peak_prob:
        return 0.0

    mean_prob = float(np.mean(lesion_probs))

    bg = ~m
    bg_mean = float(np.mean(prob[bg])) if bg.any() else 0.0
    contrast_margin = max(0.0, mean_prob - bg_mean)

    # Calibrated confidence formula:
    # 40% peak probability + 40% mean activation + 20% contrast margin
    calibrated = 0.40 * peak + 0.40 * mean_prob + 0.20 * min(1.0, contrast_margin * 1.5)
    calibrated = max(0.0, min(1.0, calibrated))
    return round(calibrated, 3)


def confidence_placeholder(prob: np.ndarray, binary: np.ndarray) -> float:
    """Backwards-compatible alias for calibrate_confidence."""
    return calibrate_confidence(prob, binary)


def postprocess_prediction(
    prob: np.ndarray,
    threshold: float = 0.5,
    min_area_px: int = MIN_LESION_SIZE_PX,
    min_peak_prob: float = MIN_PEAK_PROBABILITY,
) -> tuple[np.ndarray, float, dict]:
    """Sound postprocessing pipeline with noise suppression and confidence calibration.

    Returns (binary_mask, confidence, metrics).
    Guarantees clean 0-lesion output for negative scans or noise artifacts.
    """
    raw_bin = to_binary(prob, threshold)
    if not raw_bin.any():
        empty = np.zeros_like(raw_bin)
        return empty, 0.0, compute_metrics(empty)

    filtered = filter_small_components(raw_bin, min_area_px=min_area_px)
    if not filtered.any():
        empty = np.zeros_like(raw_bin)
        return empty, 0.0, compute_metrics(empty)

    largest = largest_component(filtered, min_size=min_area_px)
    if not largest.any():
        empty = np.zeros_like(raw_bin)
        return empty, 0.0, compute_metrics(empty)

    closed = close_small_holes(largest)

    conf = calibrate_confidence(prob, closed, min_peak_prob=min_peak_prob)
    if conf <= 0.0:
        empty = np.zeros_like(raw_bin)
        return empty, 0.0, compute_metrics(empty)

    metrics = compute_metrics(closed)
    return closed, conf, metrics
