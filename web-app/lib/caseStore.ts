/**
 * Case store — unified persistence facade.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * Strategy:
 * - Supabase configured → durable Postgres rows (see lib/supabase.ts).
 * - Otherwise → per-instance in-memory Map with a 24 h TTL. Combined with the
 *   browser sessionStorage mirror in CaseNotFound, this keeps the MVP demo
 *   functional even though serverless instances are ephemeral. The UI labels
 *   this clearly ("demo storage").
 */
import type { AnalysisResult } from './types';
import { fetchAnalysis as fetchFromSupabase, isSupabaseConfigured, saveAnalysis as saveToSupabase } from './supabase';

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

interface MemoryEntry {
  result: AnalysisResult;
  expiresAt: number;
}

// globalThis survives dev-server HMR; each serverless instance gets its own.
const g = globalThis as typeof globalThis & {
  __medvisionCaseStore?: Map<string, MemoryEntry>;
};
const store: Map<string, MemoryEntry> = (g.__medvisionCaseStore ??= new Map());

function sweep(): void {
  const now = Date.now();
  // Use forEach instead of for-of: avoids TS2802 (Map iteration requires es2015+ target).
  store.forEach((entry, id) => {
    if (entry.expiresAt < now) store.delete(id);
  });
  while (store.size > MAX_ENTRIES) {
    // Array.from bypasses the for-of emit path and is safe at any target.
    const oldest = Array.from(store.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (!oldest) break;
    store.delete(oldest[0]);
  }
}

export function storageMode(): 'memory' | 'supabase' {
  return isSupabaseConfigured() ? 'supabase' : 'memory';
}

export async function saveCase(result: AnalysisResult): Promise<void> {
  sweep();
  store.set(result.caseId, { result, expiresAt: Date.now() + TTL_MS });
  // Best-effort durable write; memory copy remains the fast path either way.
  await saveToSupabase(result);
}

export async function getCase(id: string): Promise<AnalysisResult | null> {
  const local = store.get(id);
  if (local && local.expiresAt > Date.now()) return local.result;
  return fetchFromSupabase(id);
}
