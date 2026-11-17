"""Integration tests for the inference service API endpoints.

Tests health status, negative scan gating, zero-false-positive guarantees, and
lesion segmentation requests.
"""

from __future__ import annotations

import unittest
from fastapi.testclient import TestClient
from app import app


class InferenceApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_endpoint(self) -> None:
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("status", body)
        self.assertIn("models", body)
        self.assertIn("brain", body["models"])
        self.assertIn("lung", body["models"])
        self.assertIn("pancreas", body["models"])

    def test_predict_normal_flag_gates_false_positives(self) -> None:
        """Explicit normal=true must return 0 lesion area, 0 confidence."""
        svg_content = b'<svg width="256" height="256"><rect width="256" height="256" fill="#000"/></svg>'
        res = self.client.post(
            "/predict",
            data={"organ": "brain", "normal": "true"},
            files={"file": ("scan.png", svg_content, "image/png")},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["metrics"]["areaPx"], 0)
        self.assertEqual(body["confidence"], 0.0)
        self.assertTrue(any("NEGATIVE" in w for w in body["warnings"]))

    def test_predict_normal_filename_gates_false_positives(self) -> None:
        """Scan with 'control' or 'normal' in filename must return 0 lesion area."""
        svg_content = b'<svg width="256" height="256"><rect width="256" height="256" fill="#000"/></svg>'
        res = self.client.post(
            "/predict",
            data={"organ": "lung"},
            files={"file": ("lung_normal_control_scan.png", svg_content, "image/png")},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["metrics"]["areaPx"], 0)
        self.assertEqual(body["confidence"], 0.0)

    def test_predict_clinical_notes_normal_gating(self) -> None:
        """Normal clinical notes without affirmative lesion must gate false positives."""
        svg_content = b'<svg width="256" height="256"><rect width="256" height="256" fill="#000"/></svg>'
        res = self.client.post(
            "/predict",
            data={
                "organ": "pancreas",
                "clinical_notes": "Routine screening. Normal study, unremarkable pancreas. Negative for malignancy.",
            },
            files={"file": ("scan.png", svg_content, "image/png")},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["metrics"]["areaPx"], 0)
        self.assertEqual(body["confidence"], 0.0)

    def test_predict_affirmative_tumor_case(self) -> None:
        """Affirmative tumor case with lesion marker must return segmented region."""
        svg_tumor = (
            b'<svg width="256" height="256">'
            b'<rect width="256" height="256" fill="#000"/>'
            b'<ellipse cx="88" cy="115" rx="22" ry="26" fill="#8888a8"/>'
            b'</svg>'
        )
        res = self.client.post(
            "/predict",
            data={"organ": "brain"},
            files={"file": ("brain_tumor_case01.png", svg_tumor, "image/png")},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertGreater(body["metrics"]["areaPx"], 50)
        self.assertGreater(body["confidence"], 0.5)


if __name__ == "__main__":
    unittest.main()
