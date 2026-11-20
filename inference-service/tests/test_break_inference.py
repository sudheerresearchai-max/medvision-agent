import unittest
import numpy as np
from utils.visualization import synthetic_mask
from utils.postprocessing import (
    parse_clinical_findings,
    check_clinical_is_negative,
    check_clinical_has_positive,
    is_control_filename,
    postprocess_prediction,
    calibrate_confidence,
)

class InferenceBreakTests(unittest.TestCase):
    def test_arbitrary_image_without_clinical_notes_is_not_tumor(self):
        dummy_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 500
        mask, conf = synthetic_mask("brain", dummy_png, 256, 256, is_normal=False, filename="patient_head_slice05.png")
        self.assertEqual(mask.sum(), 0, "Arbitrary image without tumor indication must return 0 lesion area")
        self.assertEqual(conf, 0.0)

    def test_app_clinical_notes_negation_in_predict(self):
        notes_lower = "study is negative for tumor, no mass or lesion identified. normal brain mri."
        clinical_is_negative = check_clinical_is_negative(notes_lower)
        self.assertTrue(clinical_is_negative, "Clinical narrative with negated findings must evaluate to negative")

    def test_synthetic_mask_clinical_notes_import(self):
        mask, conf = synthetic_mask("brain", b"1234", 256, 256, clinical_notes="normal brain")
        self.assertEqual(mask.sum(), 0)
        self.assertEqual(conf, 0.0)

    def test_synthetic_mask_positive_indication(self):
        mask, conf = synthetic_mask("brain", b"1234", 256, 256, clinical_notes="large fronto-temporal mass identified")
        self.assertGreater(mask.sum(), 0)
        self.assertGreater(conf, 0.5)

    def test_rule_out_is_not_falsely_negative(self):
        notes = "Clinical history: Prior normal scan. Rule out brain tumor."
        self.assertFalse(check_clinical_is_negative(notes), "Rule out tumor is an indication, NOT a negative study")

    def test_cannot_rule_out_is_not_falsely_negative(self):
        notes = "Normal chest contours otherwise. Cannot rule out lung mass."
        self.assertFalse(check_clinical_is_negative(notes), "Cannot rule out mass must NOT be classified as negative")

    def test_mass_not_seen_on_prior_is_not_falsely_negative(self):
        notes = "Normal ventricles. Mass seen in left parietal lobe, not seen on prior study."
        self.assertFalse(check_clinical_is_negative(notes), "Newly identified mass must NOT be negated by 'not seen on prior'")

    def test_no_mass_effect_with_mass_is_not_falsely_negative(self):
        notes = "A 2.5 cm enhancing mass in right frontal lobe with no mass effect or midline shift."
        self.assertFalse(check_clinical_is_negative(notes), "No mass effect must not negate genuine parenchymal mass")

    def test_is_control_filename_filters(self):
        self.assertFalse(is_control_filename("abnormal_brain_scan.png"))
        self.assertFalse(is_control_filename("nuclear_medicine_scan.png"))
        self.assertFalse(is_control_filename("rule_out_mass.png"))
        self.assertFalse(is_control_filename("clear_cell_carcinoma.png"))
        self.assertFalse(is_control_filename("triple_negative.png"))
        self.assertTrue(is_control_filename("brain_mri_normal_control_case04.png"))
        self.assertTrue(is_control_filename("control_slice_01.png"))
        self.assertTrue(is_control_filename("healthy_patient.png"))
        self.assertTrue(is_control_filename("unremarkable_study.png"))

    def test_bare_ordering_indications_yield_zero_lesion(self):
        """Bare ordering indications without prior findings must NOT synthesize a false-positive tumor."""
        from fastapi.testclient import TestClient
        from app import app
        import io
        from PIL import Image

        client = TestClient(app)
        img = Image.new("L", (256, 256), color=40)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        dummy_png = buf.getvalue()

        test_cases = [
            ("pancreas", "Rule out pancreatic tumor"),
            ("brain", "Indication: Rule out brain tumor."),
            ("lung", "Indication: Rule out lung nodule."),
        ]

        for organ, notes in test_cases:
            # 1. check_clinical_is_negative must be False (not an affirmative normal finding)
            self.assertFalse(check_clinical_is_negative(notes), f"'{notes}' is an ordering indication, not a negative finding")
            # 2. check_clinical_has_positive must be False (not an affirmative neoplasm finding)
            self.assertFalse(check_clinical_has_positive(notes), f"'{notes}' must not be treated as an affirmative neoplasm finding")
            # 3. synthetic_mask directly must return zero mask and 0.0 confidence
            mask, conf = synthetic_mask(organ, dummy_png, 256, 256, is_normal=False, filename="scan_01.png", clinical_notes=notes)
            self.assertEqual(mask.sum(), 0, f"synthetic_mask for '{notes}' must yield 0 pixels")
            self.assertEqual(conf, 0.0, f"synthetic_mask for '{notes}' must yield 0.0 confidence")
            # 4. /predict endpoint must return areaPx == 0, confidence == 0.0, bbox is None
            res = client.post(
                "/predict",
                data={"organ": organ, "clinical_notes": notes},
                files={"file": ("scan_01.png", dummy_png, "image/png")},
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["metrics"]["areaPx"], 0, f"areaPx must be 0 for '{notes}'")
            self.assertEqual(data["confidence"], 0.0, f"confidence must be 0.0 for '{notes}'")
            self.assertIsNone(data["metrics"]["bbox"], f"bbox must be None for '{notes}'")

    def test_active_suspicion_vs_bare_indication(self):
        """Active suspicion ('cannot rule out') must trigger positive finding; bare indication ('rule out') must not."""
        self.assertTrue(check_clinical_has_positive("Cannot rule out pancreatic tumor"))
        self.assertTrue(check_clinical_has_positive("Unable to exclude brain mass"))
        self.assertFalse(check_clinical_has_positive("Rule out pancreatic tumor"))
        self.assertFalse(check_clinical_has_positive("r/o brain mass"))
        self.assertFalse(check_clinical_has_positive("no brain mass identified"))

    def test_family_history_does_not_affirm_tumor(self):
        """Family history mentions (e.g. 'mother had', 'father had', 'fhx of') must NOT affirm neoplasm for patient."""
        dummy_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 500

        # 1. Family history with normal MRI
        note1 = "Patient reports family history of glioma. Routine brain MRI is normal."
        has_norm, aff, neg = parse_clinical_findings(note1)
        self.assertTrue(has_norm, f"'{note1}' must detect normal cue")
        self.assertEqual(aff, 0, f"'{note1}' must NOT affirm glioma for patient")
        self.assertTrue(check_clinical_is_negative(note1), f"'{note1}' must evaluate to is_negative=True")
        self.assertFalse(check_clinical_has_positive(note1), f"'{note1}' must evaluate to has_positive=False")
        mask1, conf1 = synthetic_mask("brain", dummy_png, 256, 256, is_normal=False, filename="brain_scan.png", clinical_notes=note1)
        self.assertEqual(mask1.sum(), 0, "Family history of glioma on normal scan must yield zero mask")
        self.assertEqual(conf1, 0.0)

        # 2. Mother had pancreatic adenocarcinoma with screening unremarkable
        note2 = "Mother had pancreatic adenocarcinoma. Screening scan unremarkable."
        has_norm, aff, neg = parse_clinical_findings(note2)
        self.assertTrue(has_norm, f"'{note2}' must detect normal cue")
        self.assertEqual(aff, 0, f"'{note2}' must NOT affirm adenocarcinoma for patient")
        self.assertTrue(check_clinical_is_negative(note2), f"'{note2}' must evaluate to is_negative=True")
        self.assertFalse(check_clinical_has_positive(note2), f"'{note2}' must evaluate to has_positive=False")
        mask2, conf2 = synthetic_mask("pancreas", dummy_png, 256, 256, is_normal=False, filename="pancreas_scan.png", clinical_notes=note2)
        self.assertEqual(mask2.sum(), 0, "Mother had adenocarcinoma on normal scan must yield zero mask")
        self.assertEqual(conf2, 0.0)

        # 3. Father had glioblastoma with routine MRI unremarkable
        note3 = "Father had glioblastoma. Routine MRI unremarkable."
        has_norm, aff, neg = parse_clinical_findings(note3)
        self.assertTrue(has_norm)
        self.assertEqual(aff, 0)
        self.assertTrue(check_clinical_is_negative(note3))
        self.assertFalse(check_clinical_has_positive(note3))
        mask3, conf3 = synthetic_mask("brain", dummy_png, 256, 256, is_normal=False, filename="brain_scan.png", clinical_notes=note3)
        self.assertEqual(mask3.sum(), 0)
        self.assertEqual(conf3, 0.0)

        # 4. Mother had pancreatic mass (bare familial finding without scan unremarkable)
        note4 = "Mother had pancreatic mass."
        has_norm, aff, neg = parse_clinical_findings(note4)
        self.assertEqual(aff, 0, f"'{note4}' must NOT affirm mass for patient")
        self.assertFalse(check_clinical_has_positive(note4), f"'{note4}' must evaluate to has_positive=False")
        mask4, conf4 = synthetic_mask("pancreas", dummy_png, 256, 256, is_normal=False, filename="pancreas_scan.png", clinical_notes=note4)
        self.assertEqual(mask4.sum(), 0, "Mother had pancreatic mass must NOT synthesize false positive tumor")
        self.assertEqual(conf4, 0.0)

    def test_period_delimited_rule_out_abbreviations(self):
        """Period-delimited rule-out abbreviations ('r.o.') must NOT be fragmented and affirm neoplasm."""
        dummy_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 500

        # 1. Bare indication 'r.o. brain tumor'
        note1 = "Indication: r.o. brain tumor"
        has_norm, aff, neg = parse_clinical_findings(note1)
        self.assertEqual(aff, 0, f"'{note1}' must NOT affirm tumor")
        self.assertFalse(check_clinical_has_positive(note1), f"'{note1}' must NOT have positive finding")
        mask1, conf1 = synthetic_mask("brain", dummy_png, 256, 256, is_normal=False, filename="brain_scan.png", clinical_notes=note1)
        self.assertEqual(mask1.sum(), 0)
        self.assertEqual(conf1, 0.0)

        # 2. 'r.o. brain tumor' with normal study
        note2 = "Indication: r.o. brain tumor. Routine brain MRI is normal."
        has_norm, aff, neg = parse_clinical_findings(note2)
        self.assertTrue(has_norm)
        self.assertEqual(aff, 0)
        self.assertTrue(check_clinical_is_negative(note2))
        self.assertFalse(check_clinical_has_positive(note2))
        mask2, conf2 = synthetic_mask("brain", dummy_png, 256, 256, is_normal=False, filename="brain_scan.png", clinical_notes=note2)
        self.assertEqual(mask2.sum(), 0)
        self.assertEqual(conf2, 0.0)

        # 3. Capitalized 'R.O. lung mass'
        note3 = "Indication: R.O. lung mass"
        has_norm, aff, neg = parse_clinical_findings(note3)
        self.assertEqual(aff, 0)
        self.assertFalse(check_clinical_has_positive(note3))
        mask3, conf3 = synthetic_mask("lung", dummy_png, 256, 256, is_normal=False, filename="lung_scan.png", clinical_notes=note3)
        self.assertEqual(mask3.sum(), 0)
        self.assertEqual(conf3, 0.0)

    def test_post_positioned_maternal_paternal_family_history(self):
        """Post-positioned maternal/paternal mentions must NOT affirm neoplasm for patient."""
        dummy_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 500

        cases = [
            ("brain", "Glioblastoma in maternal aunt. Normal brain MRI.", "brain_scan.png"),
            ("pancreas", "Pancreatic mass in paternal uncle. Pancreas scan unremarkable.", "pancreas_scan.png"),
            ("lung", "Lung nodule in maternal grandmother. CT is normal.", "lung_scan.png"),
        ]

        for organ, note, fn in cases:
            has_norm, aff, neg = parse_clinical_findings(note)
            self.assertEqual(aff, 0, f"'{note}' must not affirm neoplasm for patient")
            self.assertTrue(check_clinical_is_negative(note), f"'{note}' must evaluate to is_negative=True")
            self.assertFalse(check_clinical_has_positive(note), f"'{note}' must evaluate to has_positive=False")
            mask, conf = synthetic_mask(organ, dummy_png, 256, 256, is_normal=False, filename=fn, clinical_notes=note)
            self.assertEqual(mask.sum(), 0, f"'{note}' must yield 0 mask area")
            self.assertEqual(conf, 0.0, f"'{note}' must yield 0.0 confidence")

    def test_normal_screening_scan_modifier(self):
        """Intervening modifiers between 'normal' and scan/study nouns must match normal cues."""
        note = "Sister had lung cancer. Normal screening scan."
        has_norm, aff, neg = parse_clinical_findings(note)
        self.assertTrue(has_norm, f"'{note}' must detect normal cue for 'normal screening scan'")
        self.assertEqual(aff, 0)
        self.assertTrue(check_clinical_is_negative(note), f"'{note}' must evaluate to is_negative=True")
        self.assertFalse(check_clinical_has_positive(note), f"'{note}' must evaluate to has_positive=False")

    def test_clause_delimited_patient_neoplasm_preservation(self):
        """True neoplasms across commas or conjunctions must NOT be swallowed by family history lookback."""
        dummy_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 500

        cases = [
            ("lung", "Father had colon cancer, chest CT reveals 3cm lung nodule.", "patient_scan.png"),
            ("pancreas", "Mother had pancreatic cancer, patient presents with 35mm pancreatic head mass.", "patient_scan.png"),
            ("pancreas", "Patient has family history of pancreatic adenocarcinoma and presents with 3cm pancreatic mass.", "patient_scan.png"),
            ("brain", "Family history of glioma, MRI shows 25mm enhancing temporal lesion.", "patient_scan.png"),
        ]

        for organ, note, fn in cases:
            has_norm, aff, neg = parse_clinical_findings(note)
            self.assertGreaterEqual(aff, 1, f"'{note}' must retain genuine patient neoplasm in affirmed count")
            self.assertTrue(check_clinical_has_positive(note), f"'{note}' must evaluate to has_positive=True")
            mask, conf = synthetic_mask(organ, dummy_png, 256, 256, is_normal=False, filename=fn, clinical_notes=note)
            self.assertGreater(mask.sum(), 0, f"'{note}' must synthesize non-zero lesion area")
            self.assertGreater(conf, 0.70, f"'{note}' must retain high confidence")


if __name__ == "__main__":
    unittest.main()
