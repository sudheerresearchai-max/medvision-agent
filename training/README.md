# Training — Lightweight 2-D U-Nets

> ⚠️ **This is a research prototype and not approved for clinical diagnosis.**
> Train on public datasets only; respect every dataset's license and terms.

Three Kaggle/Colab-friendly notebooks share one skeleton (MiniUNet ~0.2 M
params, Dice+BCE loss, AMP training, best-checkpoint saving, ONNX export with a
runtime parity check):

| Notebook                   | Dataset                                          | Output                    |
| -------------------------- | ------------------------------------------------ | ------------------------- |
| `brain_training.ipynb`     | LGG Segmentation (FLAIR TIFF slices)             | `brain_unet.onnx`         |
| `lung_training.ipynb`      | Chest X-Ray Masks + Finding Lungs in CT          | `lung_unet.onnx`          |
| `pancreas_training.ipynb`  | MSD Task07 Pancreas (CT NIfTI)                   | `pancreas_unet.onnx`      |

## Datasets & licenses

| Dataset                      | Kaggle slug / Source                                           | License notes                                  |
| ---------------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| LGG Segmentation             | `mateuszbuda/lgg-mri-segmentation` (Kaggle)                   | TCIA/TCGA terms; non-commercial research       |
| Chest X-Ray Masks & Labels   | `nikhilpandey360/chest-xray-masks-and-labels` (Kaggle)        | Montgomery+Shenzhen; research use              |
| Finding Lungs in CT          | `kmader/finding-lungs-in-ct-data` (Kaggle)                    | Research use terms                             |
| MSD Task07 Pancreas          | medicaldecathlon.com / S3 mirror                               | CC-BY-SA 4.0                                   |

**You are responsible for complying with each license.** None of these may be
redistributed through this repo.

## Running on Colab

1. Runtime → Change runtime type → **T4 GPU**.
2. Upload the notebook, run top-to-bottom.
3. For brain/lung: download dataset from Kaggle, upload to Colab, and set the
   `DATA_ROOT` path. Each notebook has `TODO` markers.
4. For pancreas: the notebook auto-downloads from S3 (~880 MB).
5. Grab the exported ONNX from `outputs/`
   (`from google.colab import files; files.download(...)`) or copy from the
   Kaggle *Output* tab.

## Running on Kaggle

1. Create Notebook → File → Import Notebook.
2. Settings → Accelerator → **GPU T4**.
3. **Add Input**: search the Datasets tab for the corresponding Kaggle dataset:
   - Brain: `mateuszbuda/lgg-mri-segmentation`
   - Lung: `nikhilpandey360/chest-xray-masks-and-labels` and/or
           `kmader/finding-lungs-in-ct-data`
   - Pancreas: search `msd task07 pancreas`
4. The notebook auto-locates `/kaggle/input/...` paths. Adjust `CANDIDATES`
   if the mount path differs.
5. The final cell prints exactly where to copy the `.onnx`.

## After training

```bash
# inside inference-service/
cp <organ>_unet.onnx models/<organ>_unet.onnx

# Hugging Face Space:
git lfs install && git lfs track "*.onnx"
git add models/*.onnx && git commit -m "trained weights: <organ>" && git push
```

Then set `MOCK_PREDICTIONS=0` in the Space settings so missing-model fallbacks
become hard errors instead of synthetic masks.

## I/O contract (must match)

- input tensor `input`: float32 `1×1×256×256`, grayscale slice normalized to [0,1]
  - brain: FLAIR percentile-normalized
  - lung: percentile-normalized (X-ray or CT)
  - pancreas: HU clip [-160, 240] → scaled
- output tensor `logits`: float32 `H×W` logits (service applies sigmoid if needed)

## Honest expectations

These are deliberately tiny teaching baselines. Typical ballpark after the
default configs: brain dice ≈ 0.7–0.85 on tumor slices (LGG dataset gives
cleaner masks than BraTS), lung ≈ 0.90+ for lung region segmentation (not
nodule-level), pancreas ≈ 0.3–0.6 (very imbalanced). Numbers vary hugely
with subset size — always report your split discipline alongside any figure,
and never present outputs as clinically valid.
