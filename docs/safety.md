# Safety Statement

> **This is a research prototype and not approved for clinical diagnosis.**

## Scope of intended use

MedVision Agent exists to demonstrate and study:

- multi-step agentic orchestration around ML models,
- lightweight 2-D segmentation baselines for three anatomies,
- graceful degradation patterns in ML systems,
- human-readable structured reporting of model outputs.

**Permitted:** coursework, portfolio projects, methodological experiments on
public, properly licensed, de-identified datasets.

**Prohibited:** any use involving real patient care decisions; use as a
screening or triage aid; presenting outputs as medical opinions; uploading
protected health information (PHI) to the public deployments.

## Regulatory status

This system is **not** a medical device. It has not been cleared or approved
by the FDA, notified under CE/MDR, or evaluated by any other regulator. No
clinical validation studies have been performed. Nothing here should be
construed as medical advice.

## Known technical limitations

1. **2-D approximation.** Volumes are reduced to single slices; the models have
   no inter-slice context. Lesions outside the chosen slice are invisible to
   the model entirely.
2. **Tiny models. <1 M parameters** — deliberately underpowered versus the
   state of the art (nnU-Net, SwinUNETR, etc.). Expect coarse, blob-like masks.
3. **Uncalibrated confidence.** The reported confidence is a raw mean sigmoid
   probability inside the predicted mask — explicitly a placeholder, not a
   calibrated probability of malignancy or of anything clinically meaningful.
4. **Domain shift.** Performance degrades sharply across scanners, protocols,
   reconstruction kernels, contrast phases, and patient populations that differ
   from the training distribution.
5. **Class imbalance.** Pancreatic and lung lesions occupy a tiny fraction of
   pixels; Dice scores alone flatter such models.
6. **Rule-based NLP.** Clinical information extraction is keyword-based and
   brittle; it misses negation ("no seizure"), modifiers, and abbreviations.
   The optional LLM path adds its own hallucination risks.
7. **No registration, no comparison.** Prior studies are not co-registered or
   compared; "growth" language in reports is templated hedging, not analysis.
8. **Measurement units.** Pixel-space measurements are only converted to millimeters
   when physical spacing metadata is present (DICOM/NIfTI paths); PNG/JPG input
   yields pixel units with no anatomic scale.

## Data protection guidance

- Use **de-identified** data only. Remove DICOM tags, burned-in annotations,
  names, dates, and accession numbers before upload.
- Remember the operational reality of this stack: uploads transit and are
  processed on Vercel serverless functions and a Hugging Face Space, and may be
  cached in memory. Treat public deployments as public.
- If you fork this for an institution, you inherit the compliance burden
  (HIPAA/GDPR or local equivalents). Consult your privacy office.

## Dataset licensing

BraTS, LUNA16, LIDC-IDRI, and the Medical Segmentation Decathlon each carry
their own licenses and data-use agreements (several restrict commercial use
and require attribution). Review them before training:
see `training/README.md`.

## Responsible publication

When sharing results from this prototype:

- Keep the disclaimer attached to every artifact (reports already embed it).
- Report metrics with dataset provenance and split discipline.
- Never imply regulatory approval or clinical validity.
- Cite the underlying datasets and their licenses.

## Reporting issues

Security or safety concerns with this codebase: open a GitHub issue marked
`[safety]`. For anything involving real-world harm potential, do not wait for
a fix — take the deployment offline first.
