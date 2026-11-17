"""Regression tests for postprocessing, confidence calibration, and false positive rejection.

Run from ``inference-service``:
    python -m unittest discover -s tests -v
"""

from __future__ import annotations

import unittest
import numpy as np

from utils.postprocessing import (
    largest_component,
    filter_small_components,
    compute_metrics,
    confidence_placeholder,
    calibrate_confidence,
    postprocess_prediction,
    to_binary,
    MIN_LESION_SIZE_PX,
    MIN_PEAK_PROBABILITY,
)
from utils.visualization import synthetic_mask


class PostprocessingFalsePositiveTests(unittest.TestCase):
    def test_noise_speckle_is_suppressed(self) -> None:
        """Isolated noise clusters smaller than MIN_LESION_SIZE_PX must be zeroed."""
        arr = np.zeros((256, 256), dtype=np.uint8)
        # Create a tiny 4x4 cluster = 16 pixels (< 30)
        arr[50:54, 50:54] = 1

        cleaned = largest_component(arr, min_size=MIN_LESION_SIZE_PX)
        self.assertEqual(cleaned.sum(), 0, "Sub-threshold speckle was not suppressed")
        metrics = compute_metrics(cleaned)
        self.assertEqual(metrics["areaPx"], 0)
        self.assertIsNone(metrics["bbox"])

    def test_filter_small_components_removes_multiple_noise_clusters(self) -> None:
        """Multiple small noise speckles should all be filtered out."""
        arr = np.zeros((256, 256), dtype=np.uint8)
        arr[10:14, 10:14] = 1  # 16 px
        arr[80:83, 80:83] = 1  # 9 px
        arr[150:152, 150:152] = 1  # 4 px

        filtered = filter_small_components(arr, min_area_px=MIN_LESION_SIZE_PX)
        self.assertEqual(filtered.sum(), 0)

    def test_genuine_lesion_is_retained(self) -> None:
        """Lesions larger than MIN_LESION_SIZE_PX must be retained."""
        arr = np.zeros((256, 256), dtype=np.uint8)
        # Create a 10x10 cluster = 100 pixels
        arr[50:60, 50:60] = 1

        cleaned = largest_component(arr, min_size=MIN_LESION_SIZE_PX)
        self.assertEqual(cleaned.sum(), 100)
        metrics = compute_metrics(cleaned)
        self.assertEqual(metrics["areaPx"], 100)
        self.assertIsNotNone(metrics["bbox"])

    def test_calibrate_confidence_empty_mask(self) -> None:
        """Empty mask must yield strictly 0.0 confidence."""
        prob = np.zeros((256, 256), dtype=np.float32)
        binary = np.zeros((256, 256), dtype=np.uint8)
        conf = calibrate_confidence(prob, binary)
        self.assertEqual(conf, 0.0)

    def test_calibrate_confidence_subthreshold_peak(self) -> None:
        """Marginal activation with peak below MIN_PEAK_PROBABILITY must yield 0.0 confidence."""
        prob = np.full((256, 256), 0.1, dtype=np.float32)
        # Activation barely at 0.51 (below min_peak_prob 0.55)
        prob[50:65, 50:65] = 0.51
        binary = (prob >= 0.5).astype(np.uint8)

        conf = calibrate_confidence(prob, binary, min_peak_prob=MIN_PEAK_PROBABILITY)
        self.assertEqual(conf, 0.0)

    def test_calibrate_confidence_genuine_lesion(self) -> None:
        """High-probability lesion must yield calibrated confidence > 0.70."""
        prob = np.full((256, 256), 0.05, dtype=np.float32)
        prob[50:70, 50:70] = 0.88
        binary = (prob >= 0.5).astype(np.uint8)

        conf = calibrate_confidence(prob, binary)
        self.assertGreaterEqual(conf, 0.70)
        self.assertLessEqual(conf, 1.0)

    def test_postprocess_prediction_pipeline_rejects_noise(self) -> None:
        """End-to-end postprocessing rejects small specks and returns zero mask."""
        prob = np.full((256, 256), 0.02, dtype=np.float32)
        # Small speckle of 10 pixels
        prob[30:32, 30:35] = 0.95

        mask, conf, metrics = postprocess_prediction(prob, threshold=0.5, min_area_px=MIN_LESION_SIZE_PX)
        self.assertEqual(mask.sum(), 0)
        self.assertEqual(conf, 0.0)
        self.assertEqual(metrics["areaPx"], 0)

    def test_postprocess_prediction_pipeline_accepts_target(self) -> None:
        """End-to-end postprocessing accepts genuine target lesion."""
        prob = np.full((256, 256), 0.02, dtype=np.float32)
        # 15x15 lesion = 225 pixels
        prob[100:115, 100:115] = 0.85

        mask, conf, metrics = postprocess_prediction(prob, threshold=0.5, min_area_px=MIN_LESION_SIZE_PX)
        self.assertEqual(mask.sum(), 225)
        self.assertGreater(conf, 0.7)
        self.assertEqual(metrics["areaPx"], 225)

    def test_synthetic_mask_normal_control(self) -> None:
        """Synthetic mask with normal flag must return 0 lesion area and 0 confidence."""
        dummy_bytes = b"normal_control_scan_bytes"
        mask, conf = synthetic_mask("brain", dummy_bytes, 256, 256, is_normal=True)
        self.assertEqual(mask.sum(), 0)
        self.assertEqual(conf, 0.0)

    def test_synthetic_mask_normal_filename(self) -> None:
        """Synthetic mask with 'normal' in filename must return 0 lesion area."""
        dummy_bytes = b"some_bytes_12345"
        mask, conf = synthetic_mask(
            "lung", dummy_bytes, 256, 256, filename="patient_normal_scan.png"
        )
        self.assertEqual(mask.sum(), 0)
        self.assertEqual(conf, 0.0)

    def test_synthetic_mask_svg_normal_scan(self) -> None:
        """Synthetic mask for an SVG normal control scan must return 0 lesion area."""
        svg_normal = b'<svg width="256" height="256"><rect width="256" height="256" fill="#000"/><circle cx="128" cy="128" r="80" fill="#222"/></svg>'
        mask, conf = synthetic_mask("brain", svg_normal, 256, 256)
        self.assertEqual(mask.sum(), 0)
        self.assertEqual(conf, 0.0)

    def test_synthetic_mask_svg_tumor_scan(self) -> None:
        """Synthetic mask for an SVG tumor scan with marker must return non-zero mask."""
        svg_tumor = b'<svg width="256" height="256"><rect width="256" height="256" fill="#000"/><ellipse cx="88" cy="115" rx="22" ry="26" fill="#8888a8"/></svg>'
        mask, conf = synthetic_mask("brain", svg_tumor, 256, 256)
        self.assertGreater(mask.sum(), 0)
        self.assertGreater(conf, 0.5)


if __name__ == "__main__":
    unittest.main()
