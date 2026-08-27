import { NextResponse } from 'next/server';
import type { HealthResponse } from '@/lib/types';
import { DISCLAIMER } from '@/lib/types';
import { checkInferenceService, isInferenceConfigured } from '@/lib/inferenceClient';
import { isSupabaseConfigured } from '@/lib/supabase';
import { storageMode } from '@/lib/caseStore';

/**
 * GET /api/health — configuration introspection for operators/demos.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 * Reports which optional integrations are active and probes the inference
 * service when configured. Never leaks secret values.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const inferenceConfigured = isInferenceConfigured();
  const inferenceService = inferenceConfigured ? await checkInferenceService() : undefined;

  const payload: HealthResponse = {
    status: !inferenceConfigured || inferenceService?.reachable ? 'ok' : 'degraded',
    version: '0.1.0',
    disclaimer: DISCLAIMER,
    config: {
      inferenceConfigured,
      llmConfigured: Boolean(process.env.LLM_API_KEY?.trim() && process.env.LLM_BASE_URL?.trim()),
      supabaseConfigured: isSupabaseConfigured(),
      ocrEnabled: process.env.OCR_ENABLED === '1',
    },
    ...(inferenceService ? { inferenceService } : {}),
  };

  return NextResponse.json({
    ...payload,
    storageMode: storageMode(),
  });
}
