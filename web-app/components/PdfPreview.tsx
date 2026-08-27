'use client';

import { FileWarning, FileText } from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PdfPreviewProps {
  inputs: AnalysisResult['inputs'];
  pdfText?: string;
}

/**
 * Extracted-PDF-text panel. Flags scanned documents (OCR_REQUIRED) loudly
 * instead of showing an empty pane.
 */
export function PdfPreview({ inputs, pdfText }: PdfPreviewProps) {
  const hasPdf = Boolean(inputs.pdfFileName);
  if (!hasPdf) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" aria-hidden />
            PDF report extraction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No PDF was attached to this case.</p>
        </CardContent>
      </Card>
    );
  }

  const preview = pdfText?.slice(0, 2500) ?? '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" aria-hidden />
            PDF report extraction
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{inputs.pdfPageCount ?? '?'} pages</Badge>
            {inputs.ocrRequired && <Badge variant="destructive">OCR_REQUIRED</Badge>}
            {!inputs.ocrRequired && inputs.pdfTextLength > 0 && (
              <Badge variant="success">{inputs.pdfTextLength.toLocaleString()} chars</Badge>
            )}
          </div>
        </div>
        <p className="truncate text-sm text-muted-foreground">{inputs.pdfFileName}</p>
      </CardHeader>
      <CardContent>
        {inputs.ocrRequired ? (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Scanned/image-only PDF detected — no embedded text found. OCR is not
              enabled in this prototype; see <code>/docs</code> for details.
            </span>
          </div>
        ) : preview ? (
          <details open>
            <summary className="cursor-pointer select-none text-sm font-medium">
              Extracted text (first {preview.length.toLocaleString()} chars)
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-secondary/40 p-3 font-mono text-xs leading-relaxed">
              {preview}
              {(pdfText?.length ?? 0) > preview.length ? '\n… (truncated preview)' : ''}
            </pre>
          </details>
        ) : (
          <p className="text-sm text-muted-foreground">No text extracted.</p>
        )}
      </CardContent>
    </Card>
  );
}
