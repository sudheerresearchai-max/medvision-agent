import { NextResponse } from 'next/server';
import { listCases } from '@/lib/supabase';
import { storageMode } from '@/lib/caseStore';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/cases — list recent cases from Supabase (or empty in memory mode).
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * Query params:
 *   limit : number (default 20, max 100)
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

  const { cases, error } = await listCases(limit);

  return NextResponse.json({
    ok: !error,
    storageMode: storageMode(),
    supabaseConfigured: isSupabaseConfigured(),
    count: cases.length,
    cases,
    ...(error ? { supabaseError: error } : {}),
  });
}
