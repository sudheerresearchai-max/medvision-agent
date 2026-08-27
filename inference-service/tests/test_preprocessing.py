"""Regression tests for uploaded image decoding.

Run from ``inference-service`` after installing requirements:
    python -m unittest discover -s tests -v
"""

from __future__ import annotations

import gzip
import unittest

import nibabel as nib
import numpy as np

from utils.preprocessing import load_array


class NiftiUploadTests(unittest.TestCase):
    def test_compressed_nifti_upload_decodes_in_memory(self) -> None:
        """A .nii.gz upload must not require a temporary file on disk."""
        volume = np.arange(8 * 10 * 6, dtype=np.float32).reshape(8, 10, 6)
        image = nib.Nifti1Image(volume, affine=np.eye(4))

        decoded, spacing_mm, notes = load_array(
            gzip.compress(image.to_bytes()),
            "brain_scan.nii.gz",
            slice_index=2,
        )

        self.assertEqual(decoded.ndim, 2)
        self.assertEqual(decoded.shape, (10, 8))  # axial plane, display-rotated
        self.assertEqual(spacing_mm, 1.0)
        self.assertTrue(any("axial" in note for note in notes))


if __name__ == "__main__":
    unittest.main()
