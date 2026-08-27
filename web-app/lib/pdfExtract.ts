/**
 * PDF text extraction via pdfjs-dist (server-side legacy build).
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * Behavior contract:
 * - Extracts embedded text from normal (digital) PDFs.
 * - Detects scanned/image-only PDFs and flags them `OCR_REQUIRED` instead of
 *   failing silently.
 * - Optional Tesseract.js OCR is behind OCR_ENABLED=1 (see notes below).
 */
import {
  PDF_MAX_PAGES,
  type PdfExtraction,
} from './types';

/** Average characters per page below which we assume a scanned document. */
const SCANNED_CHARS_PER_PAGE = 24;
const MAX_TEXT_CHARS = 120_000;

export async function extractTextFromPdf(
  bytes: Uint8Array,
  fileName: string,
): Promise<PdfExtraction> {
  const warnings: string[] = [];
  // pdfjs-dist v4 ships ESM legacy builds suitable for Node/serverless.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    isEvalSupported: false,
    disableFontFace: true,
    // Server-side: never attempt external font/network fetching.
    standardFontDataUrl: undefined as unknown as string,
  }).promise;

  const pageCount = doc.numPages;
  const limited = Math.min(pageCount, PDF_MAX_PAGES);
  if (pageCount > PDF_MAX_PAGES) {
    warnings.push(`PDF truncated to first ${PDF_MAX_PAGES} of ${pageCount} pages.`);
  }

  let text = '';
  for (let p = 1; p <= limited; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    text += `\n[Page ${p}] ${pageText}`;
    page.cleanup();
  }
  await doc.destroy();

  text = text.trim().slice(0, MAX_TEXT_CHARS);

  const charsPerPage = text.length / Math.max(1, limited);
  const ocrRequired = text.length === 0 || charsPerPage < SCANNED_CHARS_PER_PAGE;

  let ocrAttempted = false;
  if (ocrRequired) {
    const result = await attemptOcr(bytes, fileName).catch(() => null);
    ocrAttempted = result?.performed ?? false;
    if (!ocrAttempted) {
      warnings.push(
        result?.reason ??
          'OCR_REQUIRED: no machine-readable text found. Scanned PDF detected.',
      );
    }
  }

  return { text, pageCount, truncated: pageCount > PDF_MAX_PAGES, ocrRequired, ocrAttempted, warnings };
}

/**
 * Optional OCR hook (Tesseract.js).
 *
 * NOTE ON LIMITATIONS (documented honestly):
 * Rasterizing PDF pages inside a Vercel serverless function requires an
 * out-of-process canvas implementation (`canvas` npm package), which does not
 * fit the free-tier constraint set. Therefore this MVP flags scanned PDFs as
 * OCR_REQUIRED and surfaces that flag in the UI/report instead of pretending.
 *
 * To enable experimental OCR locally: `npm i tesseract.js`, set OCR_ENABLED=1.
 * The loader below uses a webpackIgnore'd native import so missing packages do
 * not break builds.
 */
async function attemptOcr(
  _bytes: Uint8Array,
  _fileName: string,
): Promise<{ performed: boolean; reason?: string }> {
  if (process.env.OCR_ENABLED !== '1') {
    return {
      performed: false,
      reason:
        'OCR_REQUIRED: scanned PDF detected. Set OCR_ENABLED=1 with tesseract.js installed to enable experimental OCR.',
    };
  }
  // TODO(student-project): implement page rasterization + tesseract.recognize.
  return {
    performed: false,
    reason:
      'OCR_REQUIRED: OCR requested but page rasterization is not implemented in this prototype (see lib/pdfExtract.ts TODO).',
  };
}
