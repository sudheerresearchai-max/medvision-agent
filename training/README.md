# Training — Lightweight 2-D U-Nets

> ⚠️ **This is a research prototype and not approved for clinical diagnosis.**
> Train on public datasets only; respect every dataset's license and terms.

Three Kaggle/Colab-friendly notebooks share one skeleton (MiniUNet ~0.2 M
params, Dice+BCE loss, AMP training, best-checkpoint saving, ONNX export with a
runtime parity check):

| Notebook                   | Dataset                          | Output                    |
| -------------------------- | -------------------------------- | ------------------------- |
| `brain_training.ipynb`     | BraTS (FLAIR axial slices)       | `brain_unet.onnx`         |
| `lung_training.ipynb`      | LUNA16 / LIDC-IDRI (CT)          | `lung_unet.onnx`          |
| `pancreas_training.ipynb`  | MSD Task07 Pancreas (CT)         | `pancreas_unet.onnx`      |

## Datasets & licenses

| Dataset   | Source                                             | License notes                                  |
| --------- | -------------------------------------------------- | ---------------------------------------------- |
| BraTS     | synapse.org (official) · Kaggle mirrors exist      | CC-BY-NC style attribution + non-commercial    |
| LUNA16    | luna16.grand-challenge.org                         | subset of LIDC-IDRI research-use terms         |
| LIDC-IDRI | wiki.cancerimagingarchive.net                      | TCIA data usage policy; no commercial claims   |
| MSD T07   | medicaldecathlon.com                               | CC-BY-SA 4.0                                   |

**You are responsible for complying with each license.** None of these may be
redistributed through this repo.

## Running on Colab

1. Runtime → Change runtime type → **T4 GPU**.
2. Upload the notebook, run top-to-bottom.
3. Set the `DATA_ROOT` / download cell per notebook (each has TODO markers).
4. Grab the exported ONNX from `outputs/`
   (`from google.colab import files; files.download(...)`) or copy from the
   Kaggle *Output* tab.

## Running on Kaggle

1. Create Notebook → File → Import Notebook.
2. Settings → Accelerator → **GPU T4**.
3. **Add Input**: search the Datasets tab for BraTS / LUNA16 / "msd task07"
   attachments, then align the notebook's `CANDIDATES` paths with the mounted
   `/kaggle/input/...` location printed by the locate cell.
4. The final cell prints exactly where to copy the `.onnx`.

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
  - lung: HU clip [-1000, 400] → scaled
  - pancreas: HU clip [-160, 240] → scaled
- output tensor `logits`: float32 `H×W` logits (service applies sigmoid if needed)

## Honest expectations

These are deliberately tiny teaching baselines. Typical ballpark after the
default configs: brain dice ≈ 0.7–0.85 on tumor slices, lung ≈ 0.5–0.7 against
circle pseudo-labels, pancreas ≈ 0.3–0.6 (very imbalanced). Numbers vary hugely
with subset size — always report your split discipline alongside any figure,
and never present outputs as clinically valid.
