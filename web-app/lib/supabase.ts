/**
 * Optional Supabase persistence.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 * Uses the SERVICE ROLE key and therefore bypasses RLS. This module must only
 * ever be imported from server-side code (route handlers / server components).
 */
import type { AnalysisResult } from './types';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/**
 * Lazily create the admin client. Dynamic import keeps cold starts lean and
 * lets the app run with Supabase entirely absent (MVP demo mode).
 */
async function getAdmin() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Persist an analysis across cases/jobs/results/reports. Returns storage id. */
export async function saveAnalysis(result: AnalysisResult): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await getAdmin();
    const inf = result.inference;

    const { data: caseRow, error: caseErr } = await supabase
      .from('cases')
      .insert({
        status: 'completed',
        organ: result.routing.modelKey,
        modality: result.routing.modality === 'unknown' ? 'unknown' : result.routing.modality,
        routing_reason: result.routing.reason,
        clinical_info: result.clinical,
        warnings: result.safety,
        trace: result.trace,
        payload: result, // demo convenience snapshot; drop for large scale
      })
      .select('id')
      .single();
    if (caseErr) throw caseErr;

    await supabase.from('jobs').insert({
      case_id: caseRow.id,
      state: 'succeeded',
      engine: 'vercel-agent',
      started_at: result.createdAt,
      finished_at: new Date().toISOString(),
    });

    if (inf) {
      await supabase.from('results').insert({
        case_id: caseRow.id,
        model_key: inf.organ,
        model_file: inf.modelFile,
        engine: inf.engine,
        confidence: inf.confidence,
        width_px: inf.width,
        height_px: inf.height,
        area_px: inf.metrics.areaPx,
        area_fraction: inf.metrics.areaFraction,
        bbox_x: inf.metrics.bbox?.x ?? null,
        bbox_y: inf.metrics.bbox?.y ?? null,
        bbox_w: inf.metrics.bbox?.w ?? null,
        bbox_h: inf.metrics.bbox?.h ?? null,
        centroid_x: inf.metrics.centroid?.x ?? null,
        centroid_y: inf.metrics.centroid?.y ?? null,
        eq_diameter_px: inf.metrics.equivalentDiameterPx ?? null,
        mask_png_base64: inf.maskBase64,
        overlay_b64: inf.overlayBase64 ?? null,
        metrics_json: inf.metrics,
      });
    }

    await supabase.from('reports').insert({
      case_id: caseRow.id,
      version: 1,
      format: 'markdown',
      content: result.report.markdown,
    });

    return caseRow.id as string;
  } catch (err) {
    console.error('[supabase] saveAnalysis failed:', err);
    return null;
  }
}

/** List the most recent `limit` cases (lightweight — no mask blobs). */
export async function listCases(limit = 20): Promise<
  Array<{
    id: string;
    createdAt: string;
    organ: string | null;
    modality: string | null;
    routingReason: string | null;
    engine: string | null;
  }>
> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await getAdmin();
    const { data, error } = await supabase
      .from('cases')
      .select('id, created_at, organ, modality, routing_reason')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      createdAt: row.created_at as string,
      organ: (row.organ as string) ?? null,
      modality: (row.modality as string) ?? null,
      routingReason: (row.routing_reason as string) ?? null,
      engine: null, // resolved per-case via results table when needed
    }));
  } catch (err) {
    console.error('[supabase] listCases failed:', err);
    return [];
  }
}

/** Fetch a full analysis snapshot by id. Returns null when missing/error. */
export async function fetchAnalysis(caseId: string): Promise<AnalysisResult | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    // Basic uuid guard — avoid pointless round-trips on junk ids.
    if (!/^[0-9a-f-]{8,36}$/i.test(caseId)) return null;
    const supabase = await getAdmin();
    const { data, error } = await supabase
      .from('cases')
      .select('payload')
      .eq('id', caseId)
      .maybeSingle();
    if (error || !data) return null;
    return (data.payload as AnalysisResult) ?? null;
  } catch (err) {
    console.error('[supabase] fetchAnalysis failed:', err);
    return null;
  }
}
