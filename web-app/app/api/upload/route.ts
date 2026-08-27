import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { IMAGE_MAX_BYTES, PDF_MAX_BYTES, SUPPORTED_IMAGE_EXTENSIONS } from '@/lib/types';
import { errorMessage, fileExtension, sha256Hex } from '@/lib/utils';

/**
 * POST /api/upload — standalone single-file validation & inspection endpoint.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * The main flow posts files directly to /api/analyze; this endpoint exists for
 * clients that want early validation (type sniffing, checksum, page hints)
 * before running an analysis. Nothing is persisted.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const entry = form.get('file');
    if (!entry || typeof entry === 'string') {
      return NextResponse.json(
        { ok: false, detail: "multipart field 'file' is required." },
        { status: 400 },
      );
    }
    const file = entry as File;
    const ext = fileExtension(file.name);

    if (`.${ext}` !== '.' && SUPPORTED_IMAGE_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) {
      // image path
      if (file.size > IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { ok: false, kind: 'image', detail: `Image exceeds ${IMAGE_MAX_BYTES} byte cap.` },
          { status: 413 },
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      return NextResponse.json({
        ok: true,
        kind: 'image',
        fileName: file.name,
        extension: ext,
        sizeBytes: file.size,
        sha256: await sha256Hex(bytes),
        previewDataUrl: /^image\/(png|jpeg)$/.test(file.type)
          ? `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`
          : undefined, // DICOM/NIfTI have no browser preview
        warnings: [] as string[],
      });
    }

    if (ext === '.pdf') {
      if (file.size > PDF_MAX_BYTES) {
        return NextResponse.json(
          { ok: false, kind: 'pdf', detail: `PDF exceeds ${PDF_MAX_BYTES} byte cap.` },
          { status: 413 },
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const head = Buffer.from(bytes.slice(0, 5)).toString('latin1');
      return NextResponse.json({
        ok: head.startsWith('%PDF'),
        kind: 'pdf',
        fileName: file.name,
        sizeBytes: file.size,
        sha256: await sha256Hex(bytes),
        warnings: head.startsWith('%PDF') ? [] : ['Missing %PDF signature.'],
      });
    }

    return NextResponse.json(
      {
        ok: false,
        detail: `Unsupported type "${ext}". Supported images: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}; documents: .pdf`,
      },
      { status: 415 },
    );
  } catch (err) {
    console.error('[api/upload] failure:', errorMessage(err));
    return NextResponse.json({ ok: false, detail: 'Upload processing failed.' }, { status: 500 });
  }
}
