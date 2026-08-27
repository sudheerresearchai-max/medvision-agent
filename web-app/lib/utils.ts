import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn/ui-style class combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Case ids that are safe to show in a URL. crypto.randomUUID is available in
 * Node ≥ 19 and all modern browsers; we fall back for exotic runtimes.
 */
export function newCaseId(): string {
  const g = globalThis as { crypto?: Crypto };
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Extension including compound `.nii.gz`. Returns lowercase or ''. */
export function fileExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.nii.gz')) return '.nii.gz';
  const idx = lower.lastIndexOf('.');
  return idx === -1 ? '' : lower.slice(idx);
}

/** FNV-1a hash → hex string. Used for deterministic mock seeds + dedup hints. */
export function fnv1aHex(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  // Sample long buffers instead of hashing every byte (inputs can be MBs).
  const step = bytes.length > 1_000_000 ? Math.ceil(bytes.length / 1_000_000) : 1;
  for (let i = 0; i < bytes.length; i += step) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  try {
    const g = globalThis as { crypto?: Crypto };
    if (g.crypto?.subtle) {
      const digest = await g.crypto.subtle.digest('SHA-256', bytes as BufferSource);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fall through
  }
  return fnv1aHex(bytes); // non-cryptographic fallback is fine here
}

/** Small helper: safe fetch with timeout. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Extract a human-readable message from unknown throwables. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}
