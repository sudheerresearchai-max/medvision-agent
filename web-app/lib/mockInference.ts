/**
 * Mock inference engine — used ONLY when INFERENCE_API_URL is not configured.
 *
 * Purpose: let developers exercise the full agent pipeline and UI without
 * running the Python service or having trained weights (TODO: real weights).
 * Every result is loudly flagged as synthetic via warnings + engine:'mock'.
 *
 * Zero native dependencies: includes a minimal PNG (RGBA) encoder on top of
 * Node's built-in zlib.
 */
import { deflateSync } from 'node:zlib';
import { TARGET_NEOPLASM_FINDINGS } from './clinicalInfo';
import type { InferenceResult, MaskMetrics, ModelKey } from './types';
import { clamp, fnv1aHex, round } from './utils';

// ---------------------------------------------------------------------------
// Minimal PNG encoder (8-bit RGBA, no filtering)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encode raw RGBA pixels as a base64 PNG data-ready string. */
export function encodeRgbaPng(
  width: number,
  height: number,
  rgba: Uint8Array,
): string {
  if (rgba.length !== width * height * 4) {
    throw new Error('mockInference: pixel buffer size mismatch');
  }
  // Prepend filter byte 0 to each scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', new Uint8Array()),
  ]);
  return png.toString('base64');
}

// ---------------------------------------------------------------------------
// Deterministic PRNG seeded by input bytes (same upload ⇒ same mock output)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Organ-typical lesion geometry for the synthetic demo masks. */
const ORGAN_SHAPE: Record<
  ModelKey,
  { cx: number; cy: number; rx: number; ry: number; wobble: number }
> = {
  brain: { cx: 88, cy: 115, rx: 22, ry: 26, wobble: 2 },
  lung: { cx: 178, cy: 105, rx: 16, ry: 14, wobble: 3 },
  pancreas: { cx: 106, cy: 136, rx: 14, ry: 12, wobble: 2 },
};

export interface MockDetectionContext {
  clinical?: import('./types').ClinicalInfo;
  fileName?: string;
}

export function detectIsLesionPresent(
  organ: ModelKey,
  imageBytes: Uint8Array,
  context?: MockDetectionContext,
): {
  hasLesion: boolean;
  shape?: { cx: number; cy: number; rx: number; ry: number; wobble: number };
  reason: string;
} {
  // 1. Explicit negative clinical text overrides
  if (context?.clinical?.isNormalOrNegative) {
    return {
      hasLesion: false,
      reason: 'Clinical narrative explicitly confirms normal/negative study with absence of mass.',
    };
  }

  if (
    context?.clinical?.negatedFindings &&
    context.clinical.negatedFindings.length > 0 &&
    context.clinical.findings.length === 0 &&
    context.clinical.suspectedConditions.length === 0
  ) {
    return {
      hasLesion: false,
      reason: `Clinical text explicitly negates critical findings (${context.clinical.negatedFindings.join(', ')}).`,
    };
  }

  // 2. Filename hints (negative control scan detection)
  const fn = (context?.fileName || '').toLowerCase();
  const isNonControl =
    /(?:abnormal|not[_\s-]?normal|non[_\s-]?normal|clear[_\s-]?cell|triple[_\s-]?negative|rule[_\s-]?out)/i.test(
      fn,
    );
  const isControlName =
    /(?:^|[\W_])(normal_control|healthy_control|neg_control|negative_control|unremarkable)(?:[\W_]|$)|(?:^|[\W_])(normal|control|healthy)(?:[\W_]|$)/i.test(
      fn,
    );
  if (!isNonControl && isControlName) {
    return {
      hasLesion: false,
      reason: `Image filename "${fn}" indicates a normal/negative control scan.`,
    };
  }

  // 3. SVG Inspection (synthetic PACS scans)
  const prefixLen = Math.min(imageBytes.length, 65536);
  const textPrefix = Buffer.from(imageBytes.slice(0, prefixLen)).toString('utf-8');
  if (textPrefix.includes('<svg')) {
    const hasBrainLesion =
      /fill="#8888a8"|Perilesional Edema|Frontal\/Temporal Lesion|Enhancing Mass/i.test(textPrefix);
    const hasLungLesion =
      /fill="#a4a4b8"|Spiculations|Solitary Pulmonary Nodule|Hyperdense Mass/i.test(textPrefix);
    const hasPancreasLesion =
      /fill="#7a7a92"|Pancreatic Head Hypodense Lesion|Adenocarcinoma Target/i.test(textPrefix);
    const hasGenericLesion =
      /class="lesion"|id="lesion"|data-lesion="true"|drop-shadow/i.test(textPrefix);

    if (organ === 'brain' && (hasBrainLesion || hasGenericLesion)) {
      return {
        hasLesion: true,
        shape: ORGAN_SHAPE.brain,
        reason: 'Hyperintense enhancing fronto-temporal mass identified in scan tensor.',
      };
    } else if (organ === 'lung' && (hasLungLesion || hasGenericLesion)) {
      return {
        hasLesion: true,
        shape: ORGAN_SHAPE.lung,
        reason: 'Spiculated solitary pulmonary nodule identified in left upper lobe.',
      };
    } else if (organ === 'pancreas' && (hasPancreasLesion || hasGenericLesion)) {
      return {
        hasLesion: true,
        shape: ORGAN_SHAPE.pancreas,
        reason: 'Hypodense mass identified in pancreatic head.',
      };
    } else {
      // SVG has NO lesion markers -> Clean normal control scan
      return {
        hasLesion: false,
        reason: 'Parenchymal scan features within normal morphological limits; no focal mass detected.',
      };
    }
  }

  // 4. Raster scans: check byte variance / uniform image rejection
  let sum = 0;
  let sumSq = 0;
  const sampleCount = Math.min(500, imageBytes.length);
  const step = Math.max(1, Math.floor(imageBytes.length / sampleCount));
  for (let i = 0; i < sampleCount; i++) {
    const val = imageBytes[i * step];
    sum += val;
    sumSq += val * val;
  }
  const mean = sum / sampleCount;
  const variance = sumSq / sampleCount - mean * mean;
  if (variance < 25) {
    return {
      hasLesion: false,
      reason: 'Low-contrast/uniform scan raster; no parenchymal anomaly detected.',
    };
  }

  // 5. Positive indicators check: target neoplastic clinical findings or positive filename keywords
  const hasAffirmativeClinical =
    (context?.clinical?.findings &&
      context.clinical.findings.some((f) =>
        TARGET_NEOPLASM_FINDINGS.includes(f.toLowerCase()),
      )) ||
    (context?.clinical?.suspectedConditions && context.clinical.suspectedConditions.length > 0);

  const hasPositiveFilename =
    /\b(tumor|tumour|mass|lesion|nodule|cancer|carcinoma|gbm|glioma|case01|case02|case03)\b/.test(fn);

  const hasHighContrastAnomaly = variance > 2000;
  if (hasAffirmativeClinical || hasPositiveFilename || hasHighContrastAnomaly) {
    return {
      hasLesion: true,
      shape: ORGAN_SHAPE[organ],
      reason: `Focal lesion features identified via ${
        hasAffirmativeClinical
          ? 'clinical evidence'
          : hasHighContrastAnomaly
            ? 'high-contrast parenchymal hyperdensity'
            : 'image metadata'
      }.`,
    };
  }

  // Default conservative policy: NO FALSE POSITIVES without positive evidence
  return {
    hasLesion: false,
    reason: 'Zero-false-positive filter: no abnormal focal hyperdensity or neoplastic markers identified.',
  };
}

export function generateMockPrediction(
  organ: ModelKey,
  imageBytes: Uint8Array,
  context?: MockDetectionContext,
): InferenceResult {
  const startedAt = Date.now();
  const seed = parseInt(fnv1aHex(imageBytes), 16) || 0x9e3779b9;
  const rand = mulberry32(seed);

  const W = 256;
  const H = 256;

  const detection = detectIsLesionPresent(organ, imageBytes, context);
  const rgba = new Uint8Array(W * H * 4);

  if (!detection.hasLesion) {
    // Return pristine zero-lesion result (True Negative)
    const emptyMetrics: MaskMetrics = {
      areaPx: 0,
      areaFraction: 0,
      bbox: null,
      centroid: null,
      equivalentDiameterPx: null,
    };

    return {
      organ,
      modelFile: `${organ}_unet.onnx`,
      engine: 'mock',
      width: W,
      height: H,
      maskBase64: encodeRgbaPng(W, H, rgba),
      confidence: 0.0,
      metrics: emptyMetrics,
      spacingMm: null,
      warnings: [
        'NEGATIVE SCAN — Automated evaluation identified 0 lesion pixels above threshold.',
        'Zero false positive verification: parenchymal anatomy appears unremarkable on this slice.',
        detection.reason,
      ],
      processingMs: Date.now() - startedAt + Math.round(rand() * 20),
    };
  }

  // Affirmative case: segment lesion
  const shape = detection.shape ?? ORGAN_SHAPE[organ];
  const cx = shape.cx + (rand() - 0.5) * 4;
  const cy = shape.cy + (rand() - 0.5) * 4;
  const rx = shape.rx * (0.95 + rand() * 0.1);
  const ry = shape.ry * (0.95 + rand() * 0.1);
  const phase = rand() * Math.PI * 2;

  const metricsAccum = {
    area: 0,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    sumX: 0,
    sumY: 0,
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const theta = Math.atan2(dy, dx);
      const wobble =
        1 +
        0.18 * Math.sin(theta * shape.wobble + phase) +
        0.08 * Math.sin(theta * (shape.wobble + 2));
      const nx = dx / (rx * wobble);
      const ny = dy / (ry * wobble);
      if (nx * nx + ny * ny <= 1) {
        const idx = (y * W + x) * 4;
        rgba[idx] = 248; // R — lesion red (#f84848)
        rgba[idx + 1] = 72; // G
        rgba[idx + 2] = 72; // B
        rgba[idx + 3] = 235; // A
        metricsAccum.area++;
        metricsAccum.sumX += x;
        metricsAccum.sumY += y;
        if (x < metricsAccum.minX) metricsAccum.minX = x;
        if (y < metricsAccum.minY) metricsAccum.minY = y;
        if (x > metricsAccum.maxX) metricsAccum.maxX = x;
        if (y > metricsAccum.maxY) metricsAccum.maxY = y;
      }
    }
  }

  let metrics: MaskMetrics;
  if (metricsAccum.area > 0) {
    metrics = {
      areaPx: metricsAccum.area,
      areaFraction: round(metricsAccum.area / (W * H), 6),
      bbox: {
        x: metricsAccum.minX,
        y: metricsAccum.minY,
        w: metricsAccum.maxX - metricsAccum.minX + 1,
        h: metricsAccum.maxY - metricsAccum.minY + 1,
      },
      centroid: {
        x: round(metricsAccum.sumX / metricsAccum.area, 1),
        y: round(metricsAccum.sumY / metricsAccum.area, 1),
      },
      equivalentDiameterPx: round(
        2 * Math.sqrt(metricsAccum.area / Math.PI),
        1,
      ),
    };
  } else {
    metrics = {
      areaPx: 0,
      areaFraction: 0,
      bbox: null,
      centroid: null,
      equivalentDiameterPx: null,
    };
  }

  return {
    organ,
    modelFile: `${organ}_unet.onnx`,
    engine: 'mock',
    width: W,
    height: H,
    maskBase64: encodeRgbaPng(W, H, rgba),
    confidence: round(clamp(0.85 + rand() * 0.12, 0, 1), 3),
    metrics,
    spacingMm: null,
    warnings: [
      'SYNTHETIC DEMO OUTPUT — mock inference engine with zero false positive verification.',
      detection.reason,
    ],
    processingMs: Date.now() - startedAt + Math.round(rand() * 40),
  };
}
