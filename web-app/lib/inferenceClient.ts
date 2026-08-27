/**
 * Client for the external FastAPI inference service (Hugging Face Space).
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * Contract: POST {INFERENCE_API_URL}/predict (multipart)
 *   file   : scan bytes (.png .jpg .jpeg .dcm .nii .nii.gz)
 *   organ  : brain | lung | pancreas
 * Returns normalized InferenceResult or throws InferenceError.
 * When INFERENCE_API_URL is unset we fall back to the local mock engine so the
 * product remains demoable end-to-end.
 */
import { generateMockPrediction } from './mockInference';
import type { InferenceResult, MaskMetrics, ModelKey } from './types';
import { errorMessage, fetchWithTimeout } from './utils';

export class InferenceError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'InferenceError';
    this.status = status;
  }
}

const MODEL_FILES: Record<ModelKey, string> = {
  brain: 'brain_unet.onnx',
  lung: 'lung_unet.onnx',
  pancreas: 'pancreas_unet.onnx',
};

function baseUrl(): string | null {
  const url = process.env.INFERENCE_API_URL?.trim();
  if (!url) return null;
  return url.replace(/\/+$/, '');
}

export function isInferenceConfigured(): boolean {
  return baseUrl() !== null;
}

interface RawPredictResponse {
  success?: boolean;
  detail?: string;
  organ?: string;
  model?: string;
  width?: number;
  height?: number;
  maskPngBase64?: string;
  overlayPngBase64?: string;
  confidence?: number;
  metrics?: Partial<MaskMetrics>;
  spacingMm?: number | null;
  warnings?: string[];
  processingMs?: number;
  engine?: string;
}

/**
 * Run the organ-specific U-Net. Falls back to the deterministic mock engine
 * when no inference URL is configured (demo mode).
 */
export async function predictOrgan(args: {
  organ: ModelKey;
  fileName: string;
  fileBytes: Uint8Array;
}): Promise<InferenceResult> {
  const url = baseUrl();
  if (!url) {
    return generateMockPrediction(args.organ, args.fileBytes);
  }

  const timeoutMs = Number(process.env.INFERENCE_TIMEOUT_MS ?? 45000);
  const form = new FormData();
  const view = new Uint8Array(args.fileBytes); // copy-free view for Blob
  form.append('file', new Blob([view]), args.fileName || 'scan.png');
  form.append('organ', args.organ);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${url}/predict`,
      { method: 'POST', body: form },
      timeoutMs,
    );
  } catch (err) {
    const msg = errorMessage(err);
    throw new InferenceError(
      msg.includes('abort')
        ? `Inference service timed out after ${timeoutMs} ms (${url}). The Space may be cold-starting — retry once.`
        : `Cannot reach inference service at ${url}: ${msg}`,
    );
  }

  let payload: RawPredictResponse;
  try {
    payload = (await res.json()) as RawPredictResponse;
  } catch {
    throw new InferenceError(
      `Inference service returned non-JSON response (HTTP ${res.status}).`,
      res.status,
    );
  }

  if (!res.ok || payload.success === false) {
    throw new InferenceError(
      payload.detail ?? `Inference service error (HTTP ${res.status}).`,
      res.status,
    );
  }
  if (!payload.maskPngBase64) {
    throw new InferenceError('Inference service response missing maskPngBase64.');
  }

  const m = payload.metrics ?? {};
  return {
    organ: args.organ,
    modelFile: payload.model ?? MODEL_FILES[args.organ],
    engine: payload.engine === 'mock' ? 'mock' : 'onnx',
    width: payload.width ?? 256,
    height: payload.height ?? 256,
    maskBase64: payload.maskPngBase64,
    overlayBase64: payload.overlayPngBase64,
    confidence:
      typeof payload.confidence === 'number'
        ? Math.min(1, Math.max(0, payload.confidence))
        : 0,
    metrics: {
      areaPx: m.areaPx ?? 0,
      areaFraction: m.areaFraction ?? 0,
      bbox: m.bbox ?? null,
      centroid: m.centroid ?? null,
      equivalentDiameterPx: m.equivalentDiameterPx ?? null,
    },
    spacingMm: payload.spacingMm ?? null,
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
    processingMs: payload.processingMs ?? 0,
  };
}

/** Thin wrappers keeping the spec's tool naming visible in the agent trace. */
export const runBrainModel = (args: {
  fileName: string;
  fileBytes: Uint8Array;
}) => predictOrgan({ organ: 'brain', ...args });

export const runLungModel = (args: {
  fileName: string;
  fileBytes: Uint8Array;
}) => predictOrgan({ organ: 'lung', ...args });

export const runPancreasModel = (args: {
  fileName: string;
  fileBytes: Uint8Array;
}) => predictOrgan({ organ: 'pancreas', ...args });

/** Optional health probe used by /api/health. Never throws. */
export async function checkInferenceService(): Promise<{
  reachable: boolean;
  detail?: string;
}> {
  const url = baseUrl();
  if (!url) return { reachable: false, detail: 'not configured (mock mode)' };
  try {
    const res = await fetchWithTimeout(`${url}/health`, {}, 4000);
    if (!res.ok) return { reachable: false, detail: `HTTP ${res.status}` };
    return { reachable: true };
  } catch (err) {
    return { reachable: false, detail: errorMessage(err) };
  }
}
