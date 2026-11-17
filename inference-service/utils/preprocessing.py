"""Preprocessing utilities for the MedVision Agent inference service.

RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.

Converts an uploaded scan (PNG/JPG/DICOM/NIfTI) into the normalized
1×1×256×256 float tensor expected by the U-Net ONNX graphs.
"""

from __future__ import annotations

import gzip
import io
from typing import Optional

import numpy as np
from PIL import Image

SUPPORTED_EXTENSIONS = (".png", ".jpg", ".jpeg", ".dcm", ".nii", ".nii.gz", ".svg")
MODEL_INPUT_SIZE = 256
MAX_NIFTI_DECOMPRESSED_BYTES = 256 * 1024 * 1024

# CT HU window presets as (low, high) after WC/WW conversion.
HU_WINDOWS = {
    "lung": (-1350.0, 150.0),      # WC=-600, WW=1500
    "pancreas": (-160.0, 240.0),   # soft-tissue WC=40, WW=400
}


def load_array(data: bytes, filename: str, slice_index: Optional[int] = None):
    """Load any supported scan into a 2-D float32 array.

    Returns (array, spacing_mm_or_None, notes) where spacing is the physical
    pixel size in mm when metadata provides it (DICOM/NIfTI only).
    """
    name = filename.lower()
    if name.endswith(".nii.gz") or name.endswith(".nii"):
        return _load_nifti(data, slice_index)
    if name.endswith(".dcm"):
        return _load_dicom(data, slice_index)
    if name.endswith((".png", ".jpg", ".jpeg", ".svg")):
        if data.strip().startswith(b"<svg") or b"<svg" in data[:300]:
            return _load_svg(data)
        img = Image.open(io.BytesIO(data)).convert("L")
        # PNG/JPG carry no reliable physical spacing.
        return np.asarray(img, dtype=np.float32), None, []
    raise ValueError(
        f"Unsupported file extension for '{filename}'. "
        f"Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
    )


def _load_svg(data: bytes):
    """Decode basic SVG slice into a 2-D float32 array for demo / synthetic scans."""
    import re
    from PIL import ImageDraw

    text = data.decode("utf-8", errors="ignore")
    w_m = re.search(r'width=["\'](\d+)', text)
    h_m = re.search(r'height=["\'](\d+)', text)
    w = int(w_m.group(1)) if w_m else 256
    h = int(h_m.group(1)) if h_m else 256

    img = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(img)

    def parse_hex_color(col: str) -> int:
        col = col.strip().lstrip("#")
        if len(col) == 6:
            r, g, b = int(col[0:2], 16), int(col[2:4], 16), int(col[4:6], 16)
            return int(0.299 * r + 0.587 * g + 0.114 * b)
        elif len(col) == 3:
            r, g, b = int(col[0] * 2, 16), int(col[1] * 2, 16), int(col[2] * 2, 16)
            return int(0.299 * r + 0.587 * g + 0.114 * b)
        return 0

    for rm in re.finditer(r'<rect\s+[^>]*>', text):
        tag = rm.group(0)
        fill_m = re.search(r'fill=["\'](#?[0-9a-fA-F]+)', tag)
        fill = parse_hex_color(fill_m.group(1)) if fill_m else 0
        draw.rectangle([0, 0, w, h], fill=fill)

    for em in re.finditer(r'<ellipse\s+[^>]*>', text):
        tag = em.group(0)
        cx = float(re.search(r'cx=["\']([\d.]+)', tag).group(1)) if re.search(r'cx=["\']([\d.]+)', tag) else 0
        cy = float(re.search(r'cy=["\']([\d.]+)', tag).group(1)) if re.search(r'cy=["\']([\d.]+)', tag) else 0
        rx = float(re.search(r'rx=["\']([\d.]+)', tag).group(1)) if re.search(r'rx=["\']([\d.]+)', tag) else 0
        ry = float(re.search(r'ry=["\']([\d.]+)', tag).group(1)) if re.search(r'ry=["\']([\d.]+)', tag) else 0
        fill_m = re.search(r'fill=["\'](#?[0-9a-fA-F]+)', tag)
        if fill_m and fill_m.group(1).lower() != 'none':
            fill = parse_hex_color(fill_m.group(1))
            draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill)

    for cm in re.finditer(r'<circle\s+[^>]*>', text):
        tag = cm.group(0)
        cx = float(re.search(r'cx=["\']([\d.]+)', tag).group(1)) if re.search(r'cx=["\']([\d.]+)', tag) else 0
        cy = float(re.search(r'cy=["\']([\d.]+)', tag).group(1)) if re.search(r'cy=["\']([\d.]+)', tag) else 0
        r = float(re.search(r'r=["\']([\d.]+)', tag).group(1)) if re.search(r'r=["\']([\d.]+)', tag) else 0
        fill_m = re.search(r'fill=["\'](#?[0-9a-fA-F]+)', tag)
        if fill_m and fill_m.group(1).lower() != 'none':
            fill = parse_hex_color(fill_m.group(1))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)

    return np.asarray(img, dtype=np.float32), None, ["decoded vector SVG scan"]


def _load_dicom(data: bytes, slice_index: Optional[int]):
    """Single DICOM file → HU-corrected 2-D array."""
    import pydicom  # local import keeps cold start lean

    ds = pydicom.dcmread(io.BytesIO(data))
    arr = ds.pixel_array.astype(np.float32)
    slope = float(getattr(ds, "RescaleSlope", 1.0))
    intercept = float(getattr(ds, "RescaleIntercept", 0.0))
    arr = arr * slope + intercept

    if getattr(ds, "PhotometricInterpretation", "") == "MONOCHROME1":
        arr = arr.max() - arr  # inverted grayscale → standard

    if arr.ndim == 3:  # rare multi-frame file → pick requested/middle frame
        idx = _pick_slice(arr.shape[0], slice_index)
        arr = arr[idx]
        note = f"multi-frame DICOM: used frame {idx}"
    else:
        note = ""

    spacing = None
    try:
        ps = ds.PixelSpacing  # [row, column] in mm
        spacing = float(ps[0])
    except Exception:
        pass
    return arr, spacing, ([note] if note else [])


def _load_nifti(data: bytes, slice_index: Optional[int]):
    """NIfTI volume → axial 2-D slice.

    ``nib.load`` accepts a filesystem path, not an arbitrary ``BytesIO``
    stream.  Uploads arrive as bytes, so construct the image directly.  This
    keeps both ``.nii`` and compressed ``.nii.gz`` uploads fully in-memory.
    """
    import nibabel as nib  # local import keeps cold start lean

    try:
        if data[:2] == b"\x1f\x8b":
            # A small ``.nii.gz`` can otherwise expand to an unbounded volume.
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as zipped:
                raw = zipped.read(MAX_NIFTI_DECOMPRESSED_BYTES + 1)
            if len(raw) > MAX_NIFTI_DECOMPRESSED_BYTES:
                raise ValueError(
                    "Decompressed NIfTI exceeds the 256 MB service safety limit."
                )
        else:
            raw = data
        img = nib.Nifti1Image.from_bytes(raw)
    except (OSError, ValueError, EOFError) as err:
        raise ValueError(f"Could not decode NIfTI upload: {err}") from err

    # Establish a predictable RAS orientation, then take the axial (Z) plane.
    # This avoids choosing an arbitrary plane merely because it has the most
    # voxels, which was the old behavior for non-cubic volumes.
    img = nib.as_closest_canonical(img)
    vol = np.asanyarray(img.dataobj, dtype=np.float32)
    vol = np.squeeze(vol)

    if vol.ndim < 2:
        raise ValueError("NIfTI volume has fewer than 2 dimensions.")
    if vol.ndim >= 3:
        if vol.ndim == 4:  # e.g. BraTS 4-D modalities → first modality
            vol = vol[..., 0]
        axis = 2
        idx = _pick_slice(vol.shape[axis], slice_index)
        slicer = [slice(None)] * vol.ndim
        slicer[axis] = idx
        slc = vol[tuple(slicer)]
        if slc.ndim != 2:  # orientation edge case — transpose to (H, W)
            slc = np.moveaxis(slc, -1, 0)[0]
        note = f"canonical axial volume slice at index {idx}"
    else:
        slc, note = vol, ""

    spacing = None
    try:
        zooms = img.header.get_zooms()
        # A scalar lesion diameter is defensible only when the in-plane voxels
        # are square.  Otherwise retain pixel-space metrics and flag it.
        if len(zooms) >= 2 and np.isclose(zooms[0], zooms[1]):
            spacing = float(zooms[0])
        else:
            note = f"{note}; anisotropic in-plane spacing — metric size omitted".strip("; ")
    except Exception:
        pass
    return np.rot90(slc, k=1), spacing, ([note] if note else [])


def _pick_slice(n: int, requested: Optional[int]) -> int:
    """Requested index clamped into range; default = middle slice."""
    if requested is None:
        return n // 2
    return max(0, min(n - 1, int(requested)))


def looks_like_hu(arr: np.ndarray) -> bool:
    """Heuristic: raw CT HU data spans well beyond [0, 1]."""
    return float(arr.max()) > 1.5 or float(arr.min()) < -0.05


def apply_organ_window(arr: np.ndarray, organ: str) -> np.ndarray:
    """Organ-aware normalization → float32 in [0, 1].

    Lung/pancreas inputs that look like raw CT get HU windowing; everything
    else (MRI brain, exports already in [0,1]) gets robust percentile scaling.
    """
    arr = arr.astype(np.float32)

    if organ in HU_WINDOWS and looks_like_hu(arr):
        lo, hi = HU_WINDOWS[organ]
        arr = np.clip(arr, lo, hi)
        return (arr - lo) / max(hi - lo, 1e-6)

    lo_pct, hi_pct = np.percentile(arr, (0.5, 99.5))
    if hi_pct - lo_pct < 1e-6:
        return np.zeros_like(arr)
    clipped = np.clip(arr, lo_pct, hi_pct)
    return (clipped - lo_pct) / (hi_pct - lo_pct)


def prepare_input(arr01: np.ndarray, size: int = MODEL_INPUT_SIZE) -> np.ndarray:
    """[0,1] 2-D array → model tensor `1×1×size×size` float32."""
    img = Image.fromarray(np.clip(arr01 * 255.0, 0, 255).astype(np.uint8), mode="L")
    resized = img.resize((size, size), resample=Image.BILINEAR)
    x = np.asarray(resized, dtype=np.float32) / 255.0
    return x.reshape(1, 1, size, size)
