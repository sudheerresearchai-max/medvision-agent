import unittest
import numpy as np
from utils.visualization import synthetic_mask
from utils.postprocessing import (
    check_clinical_is_negative,
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

if __name__ == "__main__":
    unittest.main()
