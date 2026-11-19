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
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { ok: false, detail: "Send multipart/form-data with field 'file'." },
        { status: 415 },
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch (formErr) {
      return NextResponse.json(
        { ok: false, detail: `Malformed multipart form payload: ${errorMessage(formErr)}` },
        { status: 400 },
      );
    }

    const entry = form.get('file');
    if (!entry || typeof entry === 'string') {
      return NextResponse.json(
        { ok: false, detail: "multipart field 'file' is required." },
        { status: 400 },
      );
    }
    const file = entry as File;
    if (!file.name || !file.name.trim()) {
      return NextResponse.json(
        { ok: false, detail: 'File name is missing.' },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json(
        { ok: false, detail: 'Uploaded file is empty (0 bytes).' },
        { status: 400 },
      );
    }

    const ext = fileExtension(file.name);

    if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) {
      // image path
      if (file.size > IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { ok: false, kind: 'image', detail: `Image exceeds ${IMAGE_MAX_BYTES} byte cap.` },
          { status: 413 },
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const isBrowserImage =
        /^image\/(png|jpeg|webp)$/.test(file.type) ||
        ext === '.png' ||
        ext === '.jpg' ||
        ext === '.jpeg' ||
        ext === '.webp';

      const mime = file.type || (ext === '.webp' ? 'image/webp' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png');

      return NextResponse.json({
        ok: true,
        kind: 'image',
        fileName: file.name,
        extension: ext,
        sizeBytes: file.size,
        sha256: await sha256Hex(bytes),
        previewDataUrl: isBrowserImage
          ? `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
          : undefined, // DICOM/NIfTI have no direct browser preview
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
