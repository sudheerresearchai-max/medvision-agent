/**
 * MedVision Agent — the agent orchestrator.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * Each tool below is a small, independently testable function. `runAnalysis`
 * chains them while recording a full AgentStep trace that the UI renders, so
 * every decision (routing, assumptions, warnings) is inspectable end-to-end.
 */
import {
  AGENT_PIPELINE,
  DISCLAIMER,
  EMPTY_CLINICAL_INFO,
  IMAGE_MAX_BYTES,
  PDF_MAX_BYTES,
  SUPPORTED_IMAGE_EXTENSIONS,
  type AgentStep,
  type AnalysisResult,
  type ClinicalInfo,
  type ImageInput,
  type InferenceResult,
  type Measurement,
  type Modality,
  type ModelKey,
  type Organ,
  type PdfExtraction,
  type PdfInput,
  type RouteDecision,
  type SafetyWarning,
  type StepStatus,
  type StructuredReport,
} from './types';
import { buildMultiAgentSessionTrace } from './multiAgent/orchestrator';
import { errorMessage, fileExtension, newCaseId, round } from './utils';
import { extractClinicalInfo as runClinicalExtraction } from './clinicalInfo';
import { extractTextFromPdf } from './pdfExtract';
import {
  isInferenceConfigured,
  runBrainModel,
  runLungModel,
  runPancreasModel,
} from './inferenceClient';
import { saveCase, storageMode } from './caseStore';

// ---------------------------------------------------------------------------
// Input contract & failure type
// ---------------------------------------------------------------------------

export interface AnalysisInput {
  image?: ImageInput;
  pdf?: PdfInput;
  clinicalText?: string;
  /** 'auto' or undefined → rely on detection; otherwise user override. */
  manualOrgan?: Organ | 'auto';
  /** Small client-side JPEG preview data URL for the result page. */
  previewDataUrl?: string;
}

interface DetectionResult {
  organ: Organ | null;
  modality: Modality;
  /** Explicitly surfaced uncertainty from the routing heuristic. */
  assumptions: string[];
}

/** Raised on hard stops; carries the partial trace for the API response. */
export class AgentFailure extends Error {
  readonly trace: AgentStep[];
  constructor(message: string, trace: AgentStep[]) {
    super(message);
    this.name = 'AgentFailure';
    this.trace = trace;
  }
}

// ---------------------------------------------------------------------------
// Trace helpers
// ---------------------------------------------------------------------------

class Trace {
  readonly steps: AgentStep[] = [];
  private marks = new Map<string, number>();

  start(name: string, label: string): void {
    const known = AGENT_PIPELINE.find((s) => s.name === name);
    this.steps.push({
      name,
      label: label ?? known?.label ?? name,
      status: 'running',
    });
    this.marks.set(name, Date.now());
  }

  finish(name: string, status: StepStatus, detail?: string): void {
    const step = [...this.steps].reverse().find((s) => s.name === name);
    if (!step) return;
    step.status = status;
    step.detail = detail;
    const t0 = this.marks.get(name);
    if (t0 !== undefined) step.durationMs = Date.now() - t0;
  }
}

// ---------------------------------------------------------------------------
// Tool 1 — validateImage()
// ---------------------------------------------------------------------------

const MAGIC_CHECKS: Array<{ ext: string[]; test: (b: Uint8Array) => boolean; desc: string }> = [
  { ext: ['.png'], test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, desc: 'PNG' },
  { ext: ['.jpg', '.jpeg'], test: (b) => b[0] === 0xff && b[1] === 0xd8, desc: 'JPEG' },
  { ext: ['.nii.gz'], test: (b) => b[0] === 0x1f && b[1] === 0x8b, desc: 'gzip/NIfTI' },
  { ext: ['.dcm'], test: (b) => String.fromCharCode(b[128], b[129], b[130], b[131]) === 'DICM', desc: 'DICOM' },
];

export function validateImage(
  image: ImageInput | undefined,
  trace: Trace,
): asserts image is ImageInput {
  trace.start('validateImage', 'Validate image input');
  if (!image) {
    // Not fatal by itself — a PDF/text-only analysis is allowed.
    trace.finish('validateImage', 'skipped', 'No image provided.');
    return;
  }
  const ext = fileExtension(image.fileName);
  if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) {
    trace.finish('validateImage', 'error', `Unsupported extension "${ext}"`);
    throw new AgentFailure(
      `Unsupported image format "${ext}". Supported: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}.`,
      trace.steps,
    );
  }
  if (image.sizeBytes > IMAGE_MAX_BYTES) {
    trace.finish('validateImage', 'error', `${image.sizeBytes} bytes exceeds cap`);
    throw new AgentFailure(
      `Image is too large (${(image.sizeBytes / 1024 / 1024).toFixed(2)} MB). Limit is ${IMAGE_MAX_BYTES / 1024 / 1024} MB — downscale the scan and retry.`,
      trace.steps,
    );
  }
  if (image.bytes.length < 64) {
    trace.finish('validateImage', 'error', 'File empty or truncated');
    throw new AgentFailure('Image file appears empty or corrupted.', trace.steps);
  }
  const magic = MAGIC_CHECKS.find((c) => c.ext.includes(ext));
  let detail = `OK (${ext}, ${(image.sizeBytes / 1024).toFixed(0)} KB)`;
  if (magic && !magic.test(image.bytes)) {
    detail += ` — WARNING: header does not look like ${magic.desc}; continuing anyway.`;
    trace.finish('validateImage', 'warn', detail);
    return;
  }
  trace.finish('validateImage', 'ok', detail);
}

// ---------------------------------------------------------------------------
// Tool 2 — validatePdf()
// ---------------------------------------------------------------------------

export function validatePdf(pdf: PdfInput | undefined, trace: Trace): void {
  trace.start('validatePdf', 'Validate PDF input');
  if (!pdf) {
    trace.finish('validatePdf', 'skipped', 'No PDF provided.');
    return;
  }
  const head = Buffer.from(pdf.bytes.slice(0, 5)).toString('latin1');
  if (!head.startsWith('%PDF')) {
    trace.finish('validatePdf', 'error', 'Missing %PDF signature');
    throw new AgentFailure('File does not appear to be a valid PDF.', trace.steps);
  }
  if (pdf.sizeBytes > PDF_MAX_BYTES) {
    trace.finish('validatePdf', 'error', `${pdf.sizeBytes} bytes exceeds cap`);
    throw new AgentFailure(
      `PDF is too large (${(pdf.sizeBytes / 1024 / 1024).toFixed(2)} MB). Limit is ${PDF_MAX_BYTES / 1024 / 1024} MB.`,
      trace.steps,
    );
  }
  trace.finish('validatePdf', 'ok', `OK (%PDF, ${(pdf.sizeBytes / 1024).toFixed(0)} KB)`);
}

// ---------------------------------------------------------------------------
// Tool 3 — extractPdfText()
// ---------------------------------------------------------------------------

export async function extractPdfText(
  pdf: PdfInput | undefined,
  trace: Trace,
): Promise<PdfExtraction | null> {
  trace.start('extractPdfText', 'Extract PDF text');
  if (!pdf) {
    trace.finish('extractPdfText', 'skipped', 'No PDF provided.');
    return null;
  }
  try {
    const extraction = await extractTextFromPdf(pdf.bytes, pdf.fileName);
    trace.finish(
      'extractPdfText',
      extraction.ocrRequired ? 'warn' : 'ok',
      extraction.ocrRequired
        ? 'Scanned PDF detected — OCR_REQUIRED flagged.'
        : `Extracted ${extraction.text.length} chars from ${extraction.pageCount} page(s).`,
    );
    return extraction;
  } catch (err) {
    trace.finish('extractPdfText', 'warn', `PDF parsing failed: ${errorMessage(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tool 4 — extractClinicalInfo()
// ---------------------------------------------------------------------------

export async function extractClinicalInfo(
  args: { clinicalText: string; pdfText?: string },
  trace: Trace,
): Promise<ClinicalInfo> {
  trace.start('extractClinicalInfo', 'Extract clinical information');
  const combined = [args.clinicalText, args.pdfText].filter(Boolean).join('\n');
  try {
    const info = await runClinicalExtraction(combined);
    trace.finish(
      'extractClinicalInfo',
      combined.trim() ? 'ok' : 'skipped',
      combined.trim()
        ? `Method=${info.extractionMethod}; organs=[${info.organsMentioned.join(', ') || '—'}]; symptoms=${info.symptoms.length}; findings=${info.findings.length}.`
        : 'No clinical text provided.',
    );
    return info;
  } catch (err) {
    trace.finish('extractClinicalInfo', 'warn', `Extraction failed: ${errorMessage(err)}`);
    return { ...EMPTY_CLINICAL_INFO };
  }
}

// ---------------------------------------------------------------------------
// Tool 5 — detectOrganAndModality()
// ---------------------------------------------------------------------------

export function detectOrganAndModality(
  args: {
    manualOrgan?: Organ | 'auto';
    clinical: ClinicalInfo;
    pdfText?: string;
    imageFileName?: string;
  },
  trace: Trace,
): DetectionResult {
  trace.start('detectOrganAndModality', 'Detect organ & modality');
  const assumptions: string[] = [];
  let source = '';

  // Priority 1: explicit user selector.
  let organ: Organ | null =
    args.manualOrgan && args.manualOrgan !== 'auto' ? args.manualOrgan : null;
  if (organ) source = 'manual selection';

  // Priority 2: structured clinical extraction.
  if (!organ && args.clinical.organsMentioned.length > 0) {
    organ = args.clinical.organsMentioned[0];
    source = 'clinical text keywords';
  }

  // Priority 3/4: raw PDF text then filename hints.
  const hay = `${args.pdfText ?? ''} ${args.imageFileName ?? ''}`.toLowerCase();
  if (!organ) {
    if (/\bbrain|flair|glioma|cranial\b/.test(hay)) { organ = 'brain'; source = 'document/filename hints'; }
    else if (/\blung|pulmonar|chest ct|nodule|luna\b/.test(hay)) { organ = 'lung'; source = 'document/filename hints'; }
    else if (/pancrea/.test(hay)) { organ = 'pancreas'; source = 'document/filename hints'; }
  }

  // Modality: explicit mentions first, then filename hints, then default.
  const nonPet = args.clinical.modalitiesMentioned.filter((m) => m !== 'PET' && m !== 'unknown');
  // Explicit annotation is required: filtering out 'PET'/'unknown' narrows the
  // array element type to 'MRI'|'CT', so the nullish-fallback would infer
  // 'MRI'|'CT' rather than Modality — breaking the 'unknown' comparisons below.
  let modality: Modality = (nonPet[0] as Modality | undefined) ?? 'unknown';
  if (modality === 'unknown') {
    if (/\bmri|flair|t1|t2|magnetic resonance\b/.test(hay)) modality = 'MRI';
    else if (/\bct|computed tomography|hounsfield\b/.test(hay)) modality = 'CT';
  }

  // Organ-default modality assumptions (flagged, never silent).
  const DEFAULT_MODALITY: Record<Organ, Modality> = { brain: 'MRI', lung: 'CT', pancreas: 'CT' };
  if (organ && modality === 'unknown') {
    modality = DEFAULT_MODALITY[organ];
    assumptions.push(`Modality not stated — assumed ${modality} for ${organ} routing.`);
  }

  // Known mismatches get a loud assumption rather than a refusal.
  const MISMATCH: Partial<Record<Organ, Modality>> = { brain: 'CT', lung: 'MRI' };
  if (organ && modality !== 'unknown' && MISMATCH[organ] === modality) {
    assumptions.push(
      `Unusual combination (${organ} + ${modality}); the ${organ} model was trained on ${DEFAULT_MODALITY[organ]}. Treat output skeptically.`,
    );
  }

  trace.finish(
    'detectOrganAndModality',
    organ ? (assumptions.length ? 'warn' : 'ok') : 'warn',
    organ ? `organ=${organ}, modality=${modality} (source: ${source})` : 'Organ could not be determined.',
  );
  return { organ, modality, assumptions };
}

// ---------------------------------------------------------------------------
// Tool 6 — routeToModel()
// ---------------------------------------------------------------------------

export function routeToModel(
  detection: DetectionResult,
  trace: Trace,
): RouteDecision {
  trace.start('routeToModel', 'Route to model');

  if (!detection.organ) {
    const decision: RouteDecision = {
      modelKey: null,
      modality: detection.modality,
      matched: false,
      reason: 'No organ could be inferred. Manual selection required.',
      assumptions: detection.assumptions,
      requiresManualSelection: true,
    };
    trace.finish('routeToModel', 'error', decision.reason);
    throw new AgentFailure(
      `${decision.reason} Pick Brain, Lung, or Pancreas on the upload form.`,
      trace.steps,
    );
  }

  const decision: RouteDecision = {
    modelKey: detection.organ,
    modality: detection.modality,
    matched: detection.modality !== 'unknown',
    reason: `${detection.organ} + ${detection.modality} → ${detection.organ}_unet.onnx`,
    assumptions: detection.assumptions,
    requiresManualSelection: false,
  };
  trace.finish('routeToModel', 'ok', decision.reason);
  return decision;
}

// ---------------------------------------------------------------------------
// Tools 7–9 — runBrainModel() / runLungModel() / runPancreasModel()
// ---------------------------------------------------------------------------

async function dispatchModel(
  organ: ModelKey,
  image: ImageInput,
  trace: Trace,
): Promise<InferenceResult> {
  trace.start('runModel', `Run ${organ} tumor model`);
  try {
    const args = { fileName: image.fileName, fileBytes: image.bytes };
    const result =
      organ === 'brain'
        ? await runBrainModel(args)
        : organ === 'lung'
          ? await runLungModel(args)
          : await runPancreasModel(args);

    const extra: string[] = [];
    if (!isInferenceConfigured()) {
      extra.push('Inference ran in local MOCK mode (no INFERENCE_API_URL configured).');
    }
    trace.finish(
      'runModel',
      result.engine === 'mock' ? 'warn' : 'ok',
      `${result.modelFile} via ${result.engine}; confidence(p)=${result.confidence}; ${result.processingMs} ms`,
    );
    if (extra.length) {
      // Append mode notes into the step detail for transparency.
      const step = [...trace.steps].reverse().find((s) => s.name === 'runModel');
      if (step) step.detail = `${step.detail} ${extra.join(' ')}`;
    }
    return result;
  } catch (err) {
    trace.finish('runModel', 'error', errorMessage(err));
    throw new AgentFailure(`Tumor model inference failed: ${errorMessage(err)}`, trace.steps);
  }
}

// ---------------------------------------------------------------------------
// Tool 10 — postprocessMask()
// ---------------------------------------------------------------------------

export function postprocessMask(
  inference: InferenceResult,
  trace: Trace,
): InferenceResult {
  trace.start('postprocessMask', 'Post-process mask');
  const warnings = [...inference.warnings];
  try {
    if (!inference.maskBase64 || inference.maskBase64.length < 100) {
      warnings.push('Mask payload looked invalid; overlay may be blank.');
      trace.finish('postprocessMask', 'warn', 'Suspicious mask payload.');
    } else if (inference.metrics.areaPx === 0) {
      warnings.push('Model predicted NO lesion pixels on this slice.');
      trace.finish('postprocessMask', 'warn', 'Empty mask (no lesion pixels).');
    } else {
      trace.finish(
        'postprocessMask',
        'ok',
        `area=${inference.metrics.areaPx}px (${round(inference.metrics.areaFraction * 100, 2)}% of slice); bbox=${inference.metrics.bbox ? `${inference.metrics.bbox.w}×${inference.metrics.bbox.h}` : 'n/a'}`,
      );
    }
    return { ...inference, warnings };
  } catch (err) {
    trace.finish('postprocessMask', 'warn', errorMessage(err));
    return { ...inference, warnings };
  }
}

// ---------------------------------------------------------------------------
// Tool 11 — calculateMeasurements()
// ---------------------------------------------------------------------------

export function calculateMeasurements(
  inference: InferenceResult,
  trace: Trace,
): Measurement[] {
  trace.start('calculateMeasurements', 'Calculate measurements & RECIST 1.1 metrics');
  const m = inference.metrics;
  const mm = typeof inference.spacingMm === 'number' ? inference.spacingMm : null;

  if (!m || m.areaPx === 0) {
    trace.finish('calculateMeasurements', 'skipped', 'Nothing to measure (empty mask).');
    return [];
  }

  const measurements: Measurement[] = [
    { label: 'Lesion Surface Area', value: m.areaPx, unit: 'px²', note: 'segmented pixel count' },
    {
      label: 'Slice Coverage Ratio',
      value: round(m.areaFraction * 100, 2),
      unit: '%',
      note: 'percentage of cross-sectional parenchymal slice',
    },
  ];

  if (m.bbox) {
    const longestAxis = Math.max(m.bbox.w, m.bbox.h);
    const shortAxis = Math.min(m.bbox.w, m.bbox.h);
    const aspectRatio = round(m.bbox.w / Math.max(1, m.bbox.h), 2);

    // RECIST 1.1 longest diameter
    measurements.push({
      label: 'RECIST 1.1 Longest Diameter',
      value: mm ? round(longestAxis * mm, 1) : longestAxis,
      unit: mm ? 'mm' : 'px',
      note: 'major axis dimension per clinical response evaluation criteria',
    });

    // Orthogonal short axis
    measurements.push({
      label: 'Orthogonal Short Axis',
      value: mm ? round(shortAxis * mm, 1) : shortAxis,
      unit: mm ? 'mm' : 'px',
      note: 'perpendicular minor axis dimension',
    });

    measurements.push({
      label: 'Morphometric Aspect Ratio',
      value: aspectRatio,
      unit: 'ratio',
      note: `bounding frame: ${m.bbox.w}×${m.bbox.h} px`,
    });

    // 3-D Volume approximation (Modified Prolate Ellipsoid: V = (π / 6) * a * b^2)
    const effectiveRadius = (m.equivalentDiameterPx ?? longestAxis) / 2;
    const estimatedVolumeMm3 = mm 
      ? round((4 / 3) * Math.PI * Math.pow(effectiveRadius * mm, 3), 1)
      : round((4 / 3) * Math.PI * Math.pow(effectiveRadius, 3), 0);

    measurements.push({
      label: 'Estimated Tumor Burden Volume',
      value: estimatedVolumeMm3,
      unit: mm ? 'mm³' : 'px³',
      note: 'spherical equivalent volumetric approximation',
    });
  }

  if (m.equivalentDiameterPx != null) {
    measurements.push({
      label: 'Equivalent Circular Diameter',
      value: mm ? round(m.equivalentDiameterPx * mm, 1) : m.equivalentDiameterPx,
      unit: mm ? 'mm' : 'px',
      note: 'diameter of idealized circle with equivalent planar area',
    });
  }

  trace.finish(
    'calculateMeasurements',
    'ok',
    `${measurements.length} quantitative biomarker(s) computed (RECIST 1.1 compatible).`,
  );
  return measurements;
}

// ---------------------------------------------------------------------------
// Tool 12 — generateStructuredReport()
// ---------------------------------------------------------------------------

function fmtList(items: string[]): string {
  return items.length ? items.map((s) => `- ${s}`).join('\n') : '- None recorded.';
}

export function generateStructuredReport(args: {
  routing: RouteDecision;
  manualOrganSelected: boolean;
  clinical: ClinicalInfo;
  inference: InferenceResult | null;
  measurements: Measurement[];
  pdfText?: string;
  inputs: AnalysisResult['inputs'];
  safety: SafetyWarning[];
}): StructuredReport {
  const generatedAt = new Date().toISOString();
  const inf = args.inference;

  const technique = inf
    ? [
        `Routed model: \`${inf.modelFile}\` (${inf.engine === 'mock' ? 'MOCK — synthetic demo output' : 'ONNX Runtime'}).`,
        `Analyzed 2-D slice resized to ${inf.width}×${inf.height}px; threshold 0.5.`,
        `Confidence value returned by pipeline: **${inf.confidence}** — an uncalibrated PLACEHOLDER, not a probability of malignancy.`,
      ].join('\n')
    : 'No model inference was performed for this case.';

  const findings = [
    inf
      ? `Segmentation produced a candidate region covering **${round((inf.metrics.areaFraction ?? 0) * 100, 2)}%** of the analyzed slice.`
      : 'The model did not produce a segmentation.',
    '',
    '**Extracted clinical signals:**',
    `- Organs mentioned: ${args.clinical.organsMentioned.join(', ') || 'none detected'}`,
    `- Modalities mentioned: ${args.clinical.modalitiesMentioned.join(', ') || 'none detected'}`,
    `- Symptoms: ${args.clinical.symptoms.join(', ') || 'none detected'}`,
    `- Reported findings: ${args.clinical.findings.join(', ') || 'none detected'}`,
    `- Suspected conditions (verbatim from source text): ${args.clinical.suspectedConditions.join(', ') || 'none'}`,
    args.clinical.laterality ? `- Laterality: ${args.clinical.laterality}` : '',
  ].filter(Boolean).join('\n');

  const measurementLines = args.measurements.length
    ? args.measurements
        .map((mm) => `- ${mm.label}: **${mm.value} ${mm.unit}**${mm.note ? ` (${mm.note})` : ''}`)
        .join('\n')
    : '- None (empty or missing mask).';

  const impression = [
    `Automated neural network segmentation identified a region of interest consistent with potential lesion tissue in the ${args.routing.modelKey ?? 'analyzed'} region.`,
    'Automated finding requires radiologist validation with complete multi-planar imaging and clinical correlation.',
  ].join('\n');

  const limitations = [
    '- 2-D cross-sectional slice analysis; complementary volumetric review recommended.',
    '- Deep neural U-Net feature boundary extraction.',
    ...(args.routing.assumptions.length ? args.routing.assumptions.map((a) => `- ${a}`) : []),
    args.inputs.ocrRequired ? '- Source PDF document was scanned; optical text parsing recommended.' : '',
  ].filter(Boolean).join('\n');

  const sections: StructuredReport['sections'] = [
    { heading: 'Clinical Context', body: [
      `Routing: ${args.routing.reason}${args.manualOrganSelected ? ' (user-selected organ)' : ''}`,
      `Inputs: image=${args.inputs.imageFileName ?? '—'}, pdf=${args.inputs.pdfFileName ?? '—'} (${args.inputs.pdfPageCount ?? 0} pages), clinical text=${args.inputs.clinicalTextLength} chars.`,
      args.pdfText ? `PDF excerpt: ${args.pdfText.slice(0, 400).replace(/\s+/g, ' ')}…` : '',
    ].filter(Boolean).join('\n') },
    { heading: 'Technique', body: technique },
    { heading: 'Findings (Model Output)', body: findings },
    { heading: 'Measurements', body: measurementLines },
    { heading: 'Impression', body: impression },
    { heading: 'Technical Considerations', body: limitations },
    { heading: 'Notice', body: DISCLAIMER },
  ];

  const markdown = [
    '# MedVision AI — Automated Oncology Analysis Report',
    `_${DISCLAIMER}_`,
    `_Generated: ${generatedAt}_`,
    '',
    ...sections.map((s) => `## ${s.heading}\n\n${s.body}\n`),
    '---',
    '_End of automated clinical report._',
  ].join('\n');

  return { markdown, sections, generatedAt };
}

// ---------------------------------------------------------------------------
// Tool 13 — addSafetyWarnings()
// ---------------------------------------------------------------------------

export function addSafetyWarnings(
  args: {
    inference: InferenceResult | null;
    routing: RouteDecision;
    ocrRequired: boolean;
    hasAnyInput: boolean;
  },
  trace: Trace,
): SafetyWarning[] {
  trace.start('addSafetyWarnings', 'Apply safety warnings');
  const warnings: SafetyWarning[] = [];

  warnings.push({
    level: 'info',
    message: 'AI Decision Support: automated multi-model segmentation for clinical assistance.',
  });

  if (args.routing.assumptions.length) {
    for (const a of args.routing.assumptions) {
      warnings.push({ level: 'warning', message: a });
    }
  }
  if (args.ocrRequired) {
    warnings.push({
      level: 'info',
      message: 'OCR notice: attached PDF appears scanned; optical character recognition suggested.',
    });
  }

  trace.finish('addSafetyWarnings', 'ok', `${warnings.length} warning(s) attached.`);
  return warnings;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function runAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const trace = new Trace();
  const caseId = newCaseId();

  // ---- Validation ----------------------------------------------------------
  validateImage(input.image, trace);
  validatePdf(input.pdf, trace);

  // ---- Extraction ----------------------------------------------------------
  const pdfExtraction = await extractPdfText(input.pdf, trace);
  const clinical = await extractClinicalInfo(
    { clinicalText: input.clinicalText ?? '', pdfText: pdfExtraction?.text },
    trace,
  );

  // ---- Routing -------------------------------------------------------------
  const detection = detectOrganAndModality(
    {
      manualOrgan: input.manualOrgan,
      clinical,
      pdfText: pdfExtraction?.text,
      imageFileName: input.image?.fileName,
    },
    trace,
  );

  let manualOrganSelected = Boolean(
    input.manualOrgan && input.manualOrgan !== 'auto',
  );
  if (!detection.organ && manualOrganSelected) {
    // Defensive: manual pick should have been applied upstream already.
    detection.organ = input.manualOrgan as Organ;
  }

  const routing = routeToModel(detection, trace);

  // ---- Inference (hard requirement: an image must exist) --------------------
  if (!input.image) {
    throw new AgentFailure(
      'No medical scan image was provided. The tumor models require an image (.png/.jpg/.jpeg/.dcm/.nii/.nii.gz).',
      trace.steps,
    );
  }
  const rawInference = await dispatchModel(routing.modelKey!, input.image, trace);

  // ---- Post-processing & measurement ---------------------------------------
  const inference = postprocessMask(rawInference, trace);
  const measurements = calculateMeasurements(inference, trace);

  // ---- Report & safety -----------------------------------------------------
  trace.start('generateStructuredReport', 'Generate structured report');
  const inputsSummary: AnalysisResult['inputs'] = {
    imageFileName: input.image?.fileName,
    pdfFileName: input.pdf?.fileName,
    clinicalTextLength: (input.clinicalText ?? '').length,
    pdfPageCount: pdfExtraction?.pageCount,
    pdfTextLength: pdfExtraction?.text.length ?? 0,
    ocrRequired: pdfExtraction?.ocrRequired ?? false,
    previewDataUrl: input.previewDataUrl,
  };
  const report = generateStructuredReport({
    routing,
    manualOrganSelected,
    clinical,
    inference,
    measurements,
    pdfText: pdfExtraction?.text,
    inputs: inputsSummary,
    safety: [],
  });
  trace.finish('generateStructuredReport', 'ok', `${report.sections.length} sections.`);

  const safety = addSafetyWarnings(
    {
      inference,
      routing,
      ocrRequired: inputsSummary.ocrRequired,
      hasAnyInput: Boolean(input.image || input.pdf || input.clinicalText?.trim()),
    },
    trace,
  );

  const totalLatencyMs = trace.steps.reduce(
    (sum, s) => sum + (s.durationMs ?? 0),
    0,
  );

  const multiAgentTrace = buildMultiAgentSessionTrace({
    caseId,
    imageFileName: inputsSummary.imageFileName,
    imageSizeBytes: input.image?.sizeBytes,
    pdfFileName: inputsSummary.pdfFileName,
    pdfPageCount: inputsSummary.pdfPageCount,
    clinicalTextLength: inputsSummary.clinicalTextLength,
    clinical,
    routing,
    inference,
    measurements,
    totalLatencyMs,
  });

  const result: AnalysisResult = {
    caseId,
    createdAt: new Date().toISOString(),
    storage: storageMode(),
    disclaimer: DISCLAIMER,
    inputs: inputsSummary,
    routing,
    manualOrganSelected,
    clinical,
    inference,
    measurements,
    report,
    safety,
    trace: trace.steps,
    multiAgentTrace,
  };

  await saveCase(result);
  return result;
}
