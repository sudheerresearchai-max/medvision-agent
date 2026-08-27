# Model weights directory

Expected files (ONNX, single-channel 2-D U-Net):

| File                    | Status                                             |
| ----------------------- | -------------------------------------------------- |
| `brain_unet.onnx`       | TODO — train via `training/brain_training.ipynb`   |
| `lung_unet.onnx`        | TODO — train via `training/lung_training.ipynb`    |
| `pancreas_unet.onnx`    | TODO — train via `training/pancreas_training.ipynb`|

For local smoke tests without trained weights:

```bash
pip install onnx
python ../scripts/make_dummy_onnx.py --all
```

This creates *untrained* dummy graphs with the correct I/O contract so the
service can be exercised end-to-end. The service will loudly flag results as
synthetic while any real weight is missing.

I/O contract expected by `app.py`:
- input: float32 `1×1×256×256`, grayscale slice min-max normalized to [0,1]
- output: float32 `1×1×256×256` logits (sigmoid is applied automatically if the
  raw output leaves [0,1])

Weights are git-ignored; use Git LFS when pushing them to a Hugging Face Space.
