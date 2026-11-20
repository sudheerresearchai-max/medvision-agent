'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileImage,
  X,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { Organ } from '@/lib/types';
import { IMAGE_MAX_BYTES, PDF_MAX_BYTES, SUPPORTED_IMAGE_EXTENSIONS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn, formatBytes } from '@/lib/utils';
import { SAMPLE_CASES, type SampleCase } from '@/lib/sampleCases';
import { ClaudeThinkingPill } from '@/components/ClaudeThinkingPill';
import { ClinicalSafetyPrecautions } from '@/components/ClinicalSafetyPrecautions';

type OrganChoice = Organ | 'auto';

const ACCEPT_ATTR =
  '.png,.jpg,.jpeg,.dcm,.nii,.gz,image/png,image/jpeg,application/dicom';

function extOf(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.nii.gz')) return '.nii.gz';
  const i = lower.lastIndexOf('.');
  return i === -1 ? '' : lower.slice(i);
}

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

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || 'image/png' });
}

const THINKING_STAGES = [
  'Searching the web...',
  'Inspecting scan with Gemini Vision...',
  'Delineating neoplastic boundary contours...',
  'Searching clinical databases for guidelines & precautions...',
  'Cross-examining multi-agent clinical consensus...',
  'Synthesizing diagnostic verdict & side effects...',
  'Thinking...',
];

export function UploadForm() {
  const router = useRouter();

  const [organChoice, setOrganChoice] = React.useState<OrganChoice>('auto');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [activeSampleId, setActiveSampleId] = React.useState<string | null>(null);
  const [stageIndex, setStageIndex] = React.useState(0);
  const [thinkingStartMs, setThinkingStartMs] = React.useState<number | null>(null);
  const [selectedDemoId, setSelectedDemoId] = React.useState<string | null>(null);

  // Animate thinking stages when submitting
  React.useEffect(() => {
    if (!submitting) return;
    setThinkingStartMs(Date.now());
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % THINKING_STAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [submitting]);

  const loadSampleCase = async (sample: SampleCase) => {
    setError(null);
    setActiveSampleId(sample.id);
    setOrganChoice(sample.organ);
    setNotes(sample.clinicalNotes);
    try {
      const file = await dataUrlToFile(sample.imageDataUrl, sample.fileName);
      setImageFile(file);
      setImagePreview(sample.imageDataUrl);
    } catch (err) {
      setError('Could not load sample case image: ' + String(err));
    }
  };

  const handleFile = async (file: File | undefined | null) => {
    setError(null);
    if (activeSampleId) {
      setActiveSampleId(null);
    }
    if (!file) return;
    const ext = extOf(file.name);
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) {
      setError(`Unsupported scan format "${ext || file.name}". Supported: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}`);
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError(`Scan too large (${formatBytes(file.size)}). Limit ${formatBytes(IMAGE_MAX_BYTES)}.`);
      return;
    }
    setImageFile(file);
    const prev = await makePreview(file);
    setImagePreview(prev);
  };

  const clearFile = () => {
    setImageFile(null);
    setImagePreview(null);
    setActiveSampleId(null);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!imageFile) {
      setError('Please select or drop a medical scan image (MRI/CT).');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('organ', organChoice);
      form.append('notes', notes);
      form.append('image', imageFile);
      const preview = imagePreview || (await makePreview(imageFile));
      if (preview) form.append('imagePreview', preview);

      const res = await fetch('/api/analyze', { method: 'POST', body: form });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        const detail =
          payload?.detail ??
          payload?.error ??
          `Analysis failed (HTTP ${res.status}).`;
        throw new Error(detail);
      }

      try {
        sessionStorage.setItem(`medvision.case.${payload.result.caseId}`, JSON.stringify(payload.result));
      } catch {
        /* fallback */
      }
      router.push(`/case/${payload.result.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
      setSubmitting(false);
    }
  };

  const positiveSample = SAMPLE_CASES.find((s) => s.id === 'case01_brain_gbm') || SAMPLE_CASES[0];
  const lungSample = SAMPLE_CASES.find((s) => s.id === 'case02_lung_nsclc') || SAMPLE_CASES[1];
  const normalSample = SAMPLE_CASES.find((s) => s.isControl) || SAMPLE_CASES[3];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Quick-Load Minimal Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground text-[11px] font-mono mr-1">Quick Scans:</span>
        <button
          type="button"
          disabled={submitting}
          onClick={() => loadSampleCase(positiveSample)}
          className={cn(
            'px-3 py-1 rounded-full border text-[11px] font-mono transition-all',
            activeSampleId === positiveSample.id
              ? 'border-primary bg-primary/10 text-primary font-semibold'
              : 'border-border/70 hover:border-border bg-card/60 hover:bg-card text-foreground/80',
          )}
        >
          🔴 Glioblastoma MRI (Positive)
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => loadSampleCase(lungSample)}
          className={cn(
            'px-3 py-1 rounded-full border text-[11px] font-mono transition-all',
            activeSampleId === lungSample.id
              ? 'border-primary bg-primary/10 text-primary font-semibold'
              : 'border-border/70 hover:border-border bg-card/60 hover:bg-card text-foreground/80',
          )}
        >
          🟠 Lung Nodule CT (Positive)
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => loadSampleCase(normalSample)}
          className={cn(
            'px-3 py-1 rounded-full border text-[11px] font-mono transition-all',
            activeSampleId === normalSample.id
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-border/70 hover:border-border bg-card/60 hover:bg-card text-foreground/80',
          )}
        >
          🟢 Normal Cranial MRI (Control)
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Minimalist Drag-and-Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          className={cn(
            'relative rounded-2xl border-2 border-dashed transition-all p-6 sm:p-8 text-center',
            dragOver
              ? 'border-primary bg-primary/5 scale-[1.005]'
              : imageFile
                ? 'border-border/80 bg-card/70'
                : 'border-border/60 hover:border-border bg-card/30 hover:bg-card/60',
          )}
        >
          {imageFile ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {imagePreview && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shadow-xs shrink-0 bg-black">
                  <img
                    src={imagePreview}
                    alt="Scan thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-mono text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-sm">
                    {imageFile.name}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {formatBytes(imageFile.size)} · Ready for multimodal inspection
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={clearFile}
                className="ml-auto p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Remove scan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center justify-center gap-3">
              <input
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                disabled={submitting}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Click to browse or drop an axial scan slice
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  MRI (.png, .jpg) · CT (.dcm, .nii) · Up to 50 MB
                </p>
              </div>
            </label>
          )}
        </div>

        {/* Minimal Clinical Context Note */}
        <div>
          <input
            type="text"
            value={notes}
            disabled={submitting}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clinical history or symptoms (optional, e.g. 'progressive headache, left-sided weakness')..."
            className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-card/60 hover:bg-card focus:bg-card text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary/60 transition-all"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive font-mono">
            {error}
          </div>
        )}

        {/* Dynamic Claude Thinking Pill or Analyze Button */}
        {submitting ? (
          <div className="py-2 text-center space-y-3">
            <ClaudeThinkingPill
              isThinking={true}
              statusText={THINKING_STAGES[stageIndex]}
              elapsedMs={thinkingStartMs ? Date.now() - thinkingStartMs : 0}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={!imageFile}
              className="w-full sm:w-auto px-8 rounded-full font-mono text-xs tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-2"
            >
              Analyze Scan with Multi-Agent AI <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </form>

      {/* Understated Safety Note (Collapsed by default) */}
      <ClinicalSafetyPrecautions className="pt-2" />
    </div>
  );
}
