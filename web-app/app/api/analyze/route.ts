import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AgentFailure, runAnalysis } from '@/lib/agent';
import type { AnalysisResult, Organ } from '@/lib/types';
import { IMAGE_MAX_BYTES, PDF_MAX_BYTES } from '@/lib/types';
import { errorMessage, fileExtension } from '@/lib/utils';

/**
 * POST /api/analyze — the agent orchestrator endpoint.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * Accepts multipart/form-data:
 *   organ        : 'auto' | brain | lung | pancreas   (optional)
 *   notes        : clinical free text                 (optional)
 *   image        : scan file                          (required for inference)
 *   pdf          : report PDF                         (optional)
 *   imagePreview : small JPEG data URL from client    (optional)
 *
 * Returns { ok: true, result: AnalysisResult } or a structured error with the
 * partial agent trace for UI rendering.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Keep long enough for cold HF Space starts; capped by plan limits.
export const maxDuration = 60;

const ORGANS: ReadonlySet<string> = new Set(['brain', 'lung', 'pancreas']);

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { ok: false, detail: 'Send multipart/form-data with fields: organ, notes, image, pdf.' },
        { status: 415 },
      );
    }

    const form = await request.formData();
    const organRaw = String(form.get('organ') ?? 'auto');
    const manualOrgan: Organ | 'auto' =
      organRaw === 'auto' || !ORGANS.has(organRaw) ? 'auto' : (organRaw as Organ);
    const notes = String(form.get('notes') ?? '');
    const preview = String(form.get('imagePreview') ?? '');

    // --- Image part -----------------------------------------------------
    let imageInput: Parameters<typeof runAnalysis>[0]['image'];
    const imageEntry = form.get('image');
    if (imageEntry && typeof imageEntry !== 'string') {
      const file = imageEntry as File;
      const ext = fileExtension(file.name || 'scan.png');
      if (!file.name) {
        return NextResponse.json({ ok: false, detail: 'Image filename missing.' }, { status: 400 });
      }
      if (file.size > IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { ok: false, detail: `Image exceeds ${IMAGE_MAX_BYTES / 1024 / 1024} MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB).` },
          { status: 413 },
        );
      }
      imageInput = {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        bytes: new Uint8Array(await file.arrayBuffer()),
      };
      void ext; // deep validation happens inside the agent's validateImage tool
    }

    // --- PDF part ---------------------------------------------------------
    let pdfInput: Parameters<typeof runAnalysis>[0]['pdf'];
    const pdfEntry = form.get('pdf');
    if (pdfEntry && typeof pdfEntry !== 'string') {
      const file = pdfEntry as File;
      if (file.size > PDF_MAX_BYTES) {
        return NextResponse.json(
          { ok: false, detail: `PDF exceeds ${PDF_MAX_BYTES / 1024 / 1024} MB limit.` },
          { status: 413 },
        );
      }
      pdfInput = {
        fileName: file.name || 'report.pdf',
        sizeBytes: file.size,
        bytes: new Uint8Array(await file.arrayBuffer()),
      };
    }

    // --- Run the agent pipeline ------------------------------------------
    const result = await runAnalysis({
      image: imageInput,
      pdf: pdfInput,
      clinicalText: notes,
      manualOrgan,
      previewDataUrl: preview.startsWith('data:image/') ? preview : undefined,
    });

    return NextResponse.json({ ok: true, result: result satisfies AnalysisResult });
  } catch (err) {
    if (err instanceof AgentFailure) {
      return NextResponse.json(
        { ok: false, detail: err.message, trace: err.trace },
        { status: 400 },
      );
    }
    console.error('[api/analyze] unexpected failure:', errorMessage(err));
    return NextResponse.json(
      {
        ok: false,
        detail:
          'Unexpected analysis failure. Check INFERENCE_API_URL reachability at /api/health and retry.',
      },
      { status: 500 },
    );
  }
}
