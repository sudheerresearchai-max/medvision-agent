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
  brain: { cx: 0.52, cy: 0.44, rx: 0.075, ry: 0.09, wobble: 2 },
  lung: { cx: 0.38, cy: 0.34, rx: 0.065, ry: 0.07, wobble: 3 },
  pancreas: { cx: 0.55, cy: 0.58, rx: 0.1, ry: 0.055, wobble: 4 },
};

export function generateMockPrediction(
  organ: ModelKey,
  imageBytes: Uint8Array,
): InferenceResult {
  const startedAt = Date.now();
  const seed = parseInt(fnv1aHex(imageBytes), 16) || 0x9e3779b9;
  const rand = mulberry32(seed);

  // Match the deployed FastAPI contract. Keeping the demo at 256² also makes
  // client-side fallback instant on modest devices.
  const W = 256;
  const H = 256;
  const shape = ORGAN_SHAPE[organ];

  const cx = W * (shape.cx + (rand() - 0.5) * 0.08);
  const cy = H * (shape.cy + (rand() - 0.5) * 0.08);
  const rx = W * shape.rx * (0.8 + rand() * 0.5);
  const ry = H * shape.ry * (0.8 + rand() * 0.5);
  const phase = rand() * Math.PI * 2;

  const rgba = new Uint8Array(W * H * 4);
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
        0.22 * Math.sin(theta * shape.wobble + phase) +
        0.1 * Math.sin(theta * (shape.wobble + 3));
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
    confidence: round(clamp(0.42 + rand() * 0.28, 0, 1), 3),
    metrics,
    spacingMm: null,
    warnings: [
      'SYNTHETIC DEMO OUTPUT — no trained model was executed (mock inference mode).',
      'Configure INFERENCE_API_URL and deploy trained weights to get real model output.',
    ],
    processingMs: Date.now() - startedAt + Math.round(rand() * 40),
  };
}
