/**
 * Optional Supabase persistence.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 * Uses the SERVICE ROLE key and therefore bypasses RLS. This module must only
 * ever be imported from server-side code (route handlers / server components).
 */
import type { AnalysisResult } from './types';
import { isUuid } from './utils';

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
    const isFullUuid = isUuid(result.caseId);

    const { data: caseRow, error: caseErr } = await supabase
      .from('cases')
      .insert({
        ...(isFullUuid ? { id: result.caseId } : {}),
        deid_label: result.caseId,
        status: 'completed',
        organ: result.routing.modelKey,
        modality: result.routing.modality === 'unknown' ? 'unknown' : result.routing.modality,
        routing_reason: result.routing.reason,
        clinical_info: result.clinical,
        warnings: result.safety,
        trace: result.trace,
        payload: result,
      })
      .select('id')
      .single();

    if (caseErr) {
      console.error('[supabase] saveAnalysis cases.insert error:', caseErr.message, caseErr.details, caseErr.hint);
      throw caseErr;
    }

    const savedId = caseRow?.id ?? (isFullUuid ? result.caseId : null);

    if (savedId) {
      try {
        await supabase.from('jobs').insert({
          case_id: savedId,
          state: 'succeeded',
          engine: 'vercel-agent',
          started_at: result.createdAt,
          finished_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[supabase] jobs.insert non-fatal warning:', e);
      }

      if (inf) {
        try {
          await supabase.from('results').insert({
            case_id: savedId,
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
        } catch (e) {
          console.warn('[supabase] results.insert non-fatal warning:', e);
        }
      }

      try {
        await supabase.from('reports').insert({
          case_id: savedId,
          version: 1,
          format: 'markdown',
          content: result.report.markdown,
        });
      } catch (e) {
        console.warn('[supabase] reports.insert non-fatal warning:', e);
      }
    }

    return (savedId as string) ?? result.caseId;
  } catch (err) {
    console.error('[supabase] saveAnalysis failed:', err);
    return null;
  }
}

export interface CaseListItem {
  id: string;
  createdAt: string;
  organ: string | null;
  modality: string | null;
  routingReason: string | null;
  engine: string | null;
}

/** List the most recent `limit` cases (lightweight — no mask blobs). */
export async function listCases(limit = 20): Promise<{
  cases: CaseListItem[];
  error?: string | null;
}> {
  if (!isSupabaseConfigured()) return { cases: [] };
  try {
    const supabase = await getAdmin();
    const { data, error } = await supabase
      .from('cases')
      .select('id, deid_label, created_at, organ, modality, routing_reason')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[supabase] listCases error:', error.message, error.details, error.hint);
      return { cases: [], error: error.message };
    }

    if (!data) return { cases: [] };

    return {
      cases: data.map((row) => ({
        id: (row.deid_label as string) || (row.id as string),
        createdAt: row.created_at as string,
        organ: (row.organ as string) ?? null,
        modality: (row.modality as string) ?? null,
        routingReason: (row.routing_reason as string) ?? null,
        engine: null,
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[supabase] listCases exception:', msg);
    return { cases: [], error: msg };
  }
}

/** Fetch a full analysis snapshot by id (UUID or short hex ID). */
export async function fetchAnalysis(caseId: string): Promise<AnalysisResult | null> {
  if (!isSupabaseConfigured()) return null;
  if (!caseId || typeof caseId !== 'string') return null;

  try {
    const supabase = await getAdmin();

    // 1. If it's a valid standard UUID, query primary key id
    if (isUuid(caseId)) {
      const { data, error } = await supabase
        .from('cases')
        .select('payload')
        .eq('id', caseId)
        .maybeSingle();

      if (!error && data?.payload) {
        return data.payload as AnalysisResult;
      }
    }

    // 2. Query deid_label (safe text comparison, matches short IDs like e5c476ad9496)
    const { data: byLabel, error: labelErr } = await supabase
      .from('cases')
      .select('payload')
      .eq('deid_label', caseId)
      .maybeSingle();

    if (!labelErr && byLabel?.payload) {
      return byLabel.payload as AnalysisResult;
    }

    // 3. Fallback: filter inside payload jsonb
    const { data: byPayload, error: payloadErr } = await supabase
      .from('cases')
      .select('payload')
      .filter('payload->>caseId', 'eq', caseId)
      .maybeSingle();

    if (!payloadErr && byPayload?.payload) {
      return byPayload.payload as AnalysisResult;
    }

    return null;
  } catch (err) {
    console.error('[supabase] fetchAnalysis failed:', err);
    return null;
  }
}
