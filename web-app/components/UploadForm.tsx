'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Wind, Dna, UploadCloud, FileText, Loader2, AlertTriangle } from 'lucide-react';
import type { Organ } from '@/lib/types';
import { IMAGE_MAX_BYTES, PDF_MAX_BYTES, SUPPORTED_IMAGE_EXTENSIONS } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { AgentStatusPanel } from '@/components/AgentStatusPanel';
import { cn, formatBytes } from '@/lib/utils';

import { SAMPLE_CASES, type SampleCase } from '@/lib/sampleCases';
import { Sparkles, CheckCircle2 } from 'lucide-react';

type OrganChoice = Organ | 'auto';

const ORGAN_CARDS: Array<{
  value: Organ;
  label: string;
  hint: string;
  icon: React.ReactNode;
}> = [
  { value: 'brain', label: 'Brain', hint: 'MRI · BraTS axial protocol', icon: <Brain className="h-5 w-5" /> },
  { value: 'lung', label: 'Lung', hint: 'CT · Thoracic nodule & parenchyma', icon: <Wind className="h-5 w-5" /> },
  { value: 'pancreas', label: 'Pancreas', hint: 'CT/MRI · Abdominal parenchymal slices', icon: <Dna className="h-5 w-5" /> },
];

const ACCEPT_ATTR =
  '.png,.jpg,.jpeg,.dcm,.nii,.gz,image/png,image/jpeg,application/dicom';

function extOf(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.nii.gz')) return '.nii.gz';
  const i = lower.lastIndexOf('.');
  return i === -1 ? '' : lower.slice(i);
}

/** Downscale an uploaded scan client-side into a small JPEG preview data URL. */
async function makePreview(file: File): Promise<string | null> {
  if (!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}

// Convert data URL to File object for 1-click sample demo
async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || 'image/png' });
}

export function UploadForm() {
  const router = useRouter();

  const [organChoice, setOrganChoice] = React.useState<OrganChoice>('auto');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [activeSampleId, setActiveSampleId] = React.useState<string | null>(null);

  const loadSampleCase = async (sample: SampleCase) => {
    setError(null);
    setActiveSampleId(sample.id);
    setOrganChoice(sample.organ);
    setNotes(sample.clinicalNotes);
    try {
      const file = await dataUrlToFile(sample.imageDataUrl, sample.fileName);
      setImageFile(file);
    } catch (err) {
      setError('Could not load sample case image: ' + String(err));
    }
  };

  const pickImage = (file: File | undefined | null) => {
    setError(null);
    setActiveSampleId(null);
    if (!file) return;
    const ext = extOf(file.name);
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) {
      setError(`Unsupported scan format "${ext || file.name}". Supported: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}`);
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError(`Scan too large (${formatBytes(file.size)}). Limit ${formatBytes(IMAGE_MAX_BYTES)} — downscale/export a slice first.`);
      return;
    }
    setImageFile(file);
  };

  const pickPdf = (file: File | undefined | null) => {
    setError(null);
    if (!file) return;
    if (file.size > PDF_MAX_BYTES) {
      setError(`PDF too large (${formatBytes(file.size)}). Limit ${formatBytes(PDF_MAX_BYTES)}.`);
      return;
    }
    setPdfFile(file);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!imageFile && !pdfFile && !notes.trim()) {
      setError('Provide at least one input: a scan image, a PDF report, or clinical text.');
      return;
    }
    if (!imageFile) {
      setError('A medical scan image is required for tumor model inference (.png/.jpg/.jpeg/.dcm/.nii/.nii.gz).');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('organ', organChoice);
      form.append('notes', notes);
      form.append('image', imageFile);
      if (pdfFile) form.append('pdf', pdfFile);
      const preview = await makePreview(imageFile);
      if (preview) form.append('imagePreview', preview);

      const res = await fetch('/api/analyze', { method: 'POST', body: form });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        const detail =
          payload?.detail ??
          payload?.error ??
          `Analysis failed (HTTP ${res.status}). Check that the inference service is reachable (/api/health).`;
        throw new Error(detail);
      }

      // Mirror the case into sessionStorage for instant client-side rendering
      try {
        sessionStorage.setItem(`medvision.case.${payload.result.caseId}`, JSON.stringify(payload.result));
      } catch {
        /* quota exceeded — server copy still works */
      }
      router.push(`/case/${payload.result.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error during analysis.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ---- Interactive Clinical Demo Showcase ---- */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Preloaded Sample Cases</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Sample Data
            </Badge>
          </div>
          <CardDescription>
            Select a sample scan to automatically populate imaging and clinical notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {SAMPLE_CASES.map((sample) => {
              const isSelected = activeSampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSampleCase(sample)}
                  className={cn(
                    'group relative flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40'
                      : 'border-border/70 bg-card hover:border-primary/50 hover:bg-secondary/50',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        {sample.badge}
                      </span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                      {sample.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {sample.patientProfile}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <span className="rounded bg-secondary px-1.5 py-0.5">{sample.modality}</span>
                    <span className="truncate">{sample.fileName}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ---- Step 1: organ selector ------------------------------------- */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">1 · Target organ</CardTitle>
          <CardDescription>
            Leave on Auto-detect to let the agent infer organ &amp; modality from your
            text/PDF/filename — or force a model below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {ORGAN_CARDS.map((card) => (
              <button
                key={card.value}
                type="button"
                onClick={() => setOrganChoice(card.value)}
                aria-pressed={organChoice === card.value}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-all',
                  organChoice === card.value
                    ? 'border-primary bg-primary/5 ring-2 ring-ring'
                    : 'hover:border-primary/50 hover:bg-secondary/60',
                )}
              >
                <span className="mt-0.5 text-primary">{card.icon}</span>
                <span>
                  <span className="block font-semibold">{card.label}</span>
                  <span className="block text-xs text-muted-foreground">{card.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="organ-mode" className="text-sm">Routing mode</Label>
            <Select
              id="organ-mode"
              value={organChoice}
              onChange={(e) => setOrganChoice(e.target.value as OrganChoice)}
              className="max-w-[240px]"
            >
              <option value="auto">Auto-detect (agent decides)</option>
              <option value="brain">Force brain model</option>
              <option value="lung">Force lung model</option>
              <option value="pancreas">Force pancreas model</option>
            </Select>
            {organChoice !== 'auto' && <Badge variant="secondary">manual override active</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* ---- Step 2: inputs --------------------------------------------- */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">2 · Inputs</CardTitle>
          <CardDescription>
            Scan image required for inference; clinical text and/or PDF optional but improve routing.
            Use de-identified data only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Image dropzone */}
          <div className="space-y-1.5">
            <Label>Medical scan image <span className="text-destructive">*</span></Label>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickImage(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-input hover:bg-secondary/50',
              )}
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">
                Drop a scan here or click to browse
              </span>
              <span className="text-xs text-muted-foreground">
                .png .jpg .jpeg .dcm .nii .nii.gz — max {formatBytes(IMAGE_MAX_BYTES)}
              </span>
              <input
                type="file"
                accept={ACCEPT_ATTR}
                className="sr-only"
                onChange={(e) => pickImage(e.target.files?.[0])}
              />
            </label>
            {imageFile && (
              <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                ✓ {imageFile.name}{' '}
                <Badge variant="secondary">{formatBytes(imageFile.size)}</Badge>
                <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setImageFile(null)}>
                  remove
                </button>
              </p>
            )}
          </div>

          {/* PDF */}
          <div className="space-y-1.5">
            <Label htmlFor="pdf-input">Report PDF (optional)</Label>
            <div className="flex items-center gap-3">
              <InputFilePdf id="pdf-input" onPick={pickPdf} />
              {pdfFile && (
                <p className="flex items-center gap-2 truncate text-sm text-emerald-700 dark:text-emerald-400">
                  <FileText className="h-4 w-4 shrink-0" aria-hidden /> {pdfFile.name}{' '}
                  <Badge variant="secondary">{formatBytes(pdfFile.size)}</Badge>
                  <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setPdfFile(null)}>
                    remove
                  </button>
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Radiology report, referral, or prior-study summary. Scanned PDFs are flagged OCR_REQUIRED.
            </p>
          </div>

          {/* Clinical text */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Clinical text (optional)</Label>
            <Textarea
              id="notes"
              rows={6}
              placeholder={'e.g.\n58-year-old male, progressive headaches and one seizure episode.\nMRI brain requested. Prior note mentions left frontal enhancing lesion.'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Symptoms, doctor notes, history — used for organ/modality routing and the report.
              Never enter identifying patient information.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---- Errors ------------------------------------------------------ */}
      {error && (
        <Alert variant="critical">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <AlertTitle>Cannot analyze yet</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ---- Submit + live status --------------------------------------- */}
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-start">
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full shrink-0 sm:w-64"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Analyzing…
              </>
            ) : (
              'Run agentic analysis'
            )}
          </Button>
          <AgentStatusPanel running={submitting} className="flex-1" />
        </CardContent>
      </Card>
    </form>
  );
}

function InputFilePdf({ id, onPick }: { id: string; onPick: (f: File | null) => void }) {
  return (
    <label
      htmlFor={id}
      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      Choose PDF…
      <input
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
