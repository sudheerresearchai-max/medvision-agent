/**
 * MedVision Agent — shared domain types & constants.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 */

export type Organ = 'brain' | 'lung' | 'pancreas';
export type Modality = 'MRI' | 'CT' | 'PET' | 'unknown';
export type ModelKey = Organ; // one lightweight U-Net per organ

export const DISCLAIMER =
  'MedVision is an AI-assisted decision support system designed for multi-modal oncology analysis.';

export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.dcm',
  '.nii',
  '.nii.gz',
] as const;

export const IMAGE_MAX_BYTES = 4 * 1024 * 1024; // Vercel-friendly cap
export const PDF_MAX_BYTES = 4 * 1024 * 1024;
export const PDF_MAX_PAGES = 30;

// ---------------------------------------------------------------------------
// Agent trace
// ---------------------------------------------------------------------------

export type StepStatus = 'pending' | 'running' | 'ok' | 'warn' | 'error' | 'skipped';

export interface AgentStep {
  /** Stable machine name, e.g. `routeToModel` */
  name: string;
  /** Human label shown in the UI */
  label: string;
  status: StepStatus;
  durationMs?: number;
  detail?: string;
}

/** Ordered pipeline definition shared by the UI (optimistic view) and agent. */
export const AGENT_PIPELINE: ReadonlyArray<{ name: string; label: string }> = [
  { name: 'validateImage', label: 'Validate image input' },
  { name: 'validatePdf', label: 'Validate PDF input' },
  { name: 'extractPdfText', label: 'Extract PDF text' },
  { name: 'extractClinicalInfo', label: 'Extract clinical information' },
  { name: 'detectOrganAndModality', label: 'Detect organ & modality' },
  { name: 'routeToModel', label: 'Route to model' },
  { name: 'runModel', label: 'Run tumor model inference' },
  { name: 'postprocessMask', label: 'Post-process mask' },
  { name: 'calculateMeasurements', label: 'Calculate measurements' },
  { name: 'generateStructuredReport', label: 'Generate structured report' },
  { name: 'addSafetyWarnings', label: 'Apply safety warnings' },
];

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ImageInput {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  bytes: Uint8Array;
}

export interface PdfInput {
  fileName: string;
  sizeBytes: number;
  bytes: Uint8Array;
}

export interface PdfExtraction {
  text: string;
  pageCount: number;
  truncated: boolean;
  /** True when almost no text was found → likely a scanned document. */
  ocrRequired: boolean;
  ocrAttempted: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Clinical extraction
// ---------------------------------------------------------------------------

export interface ClinicalInfo {
  organsMentioned: Organ[];
  modalitiesMentioned: Modality[];
  symptoms: string[];
  findings: string[];
  laterality?: 'left' | 'right' | 'bilateral';
  patientAgeYears?: number;
  patientSex?: 'male' | 'female' | 'unknown';
  suspectedConditions: string[];
  /** Short snippet that triggered matches, for transparency in the UI. */
  evidenceSnippets: string[];
  extractionMethod: 'rules' | 'llm+rules' | 'none';
}

export const EMPTY_CLINICAL_INFO: ClinicalInfo = {
  organsMentioned: [],
  modalitiesMentioned: [],
  symptoms: [],
  findings: [],
  suspectedConditions: [],
  evidenceSnippets: [],
  extractionMethod: 'none',
};

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

export interface RouteDecision {
  modelKey: ModelKey | null;
  modality: Modality;
  matched: boolean;
  reason: string;
  assumptions: string[];
  requiresManualSelection: boolean;
}

// ---------------------------------------------------------------------------
// Inference
// ---------------------------------------------------------------------------

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MaskMetrics {
  areaPx: number;
  areaFraction: number;
  bbox: BoundingBox | null;
  centroid: { x: number; y: number } | null;
  equivalentDiameterPx: number | null;
}

export interface InferenceResult {
  organ: ModelKey;
  modelFile: string;
  engine: 'onnx' | 'mock';
  width: number;
  height: number;
  /** RGBA PNG (red lesion on transparent background), base64. */
  maskBase64: string;
  /** Optional service-side composite over the preprocessed slice. */
  overlayBase64?: string;
  confidence: number;
  metrics: MaskMetrics;
  spacingMm?: number | null;
  warnings: string[];
  processingMs: number;
}

// ---------------------------------------------------------------------------
// Measurements / report / safety
// ---------------------------------------------------------------------------

export interface Measurement {
  label: string;
  value: number;
  unit: string;
  note?: string;
}

export interface ReportSection {
  heading: string;
  body: string;
}

export interface StructuredReport {
  markdown: string;
  sections: ReportSection[];
  generatedAt: string;
}

export interface SafetyWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
}

// ---------------------------------------------------------------------------
// Full result persisted per case
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  caseId: string;
  createdAt: string;
  storage: 'memory' | 'supabase';
  disclaimer: string;

  inputs: {
    imageFileName?: string;
    pdfFileName?: string;
    clinicalTextLength: number;
    pdfPageCount?: number;
    pdfTextLength: number;
    ocrRequired: boolean;
    /** Small client-generated JPEG data URL of the scan (result-page preview). */
    previewDataUrl?: string;
  };

  routing: RouteDecision;
  manualOrganSelected: boolean;
  clinical: ClinicalInfo;
  inference: InferenceResult | null;
  measurements: Measurement[];
  report: StructuredReport;
  safety: SafetyWarning[];
  trace: AgentStep[];
  multiAgentTrace?: import('./multiAgent/types').MultiAgentSessionTrace;
}

// ---------------------------------------------------------------------------
// API payloads
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  disclaimer: string;
  config: {
    inferenceConfigured: boolean;
    llmConfigured: boolean;
    supabaseConfigured: boolean;
    ocrEnabled: boolean;
  };
  inferenceService?: { reachable: boolean; detail?: string };
}
