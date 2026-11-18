'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileImage,
  FileText,
  X,
  ArrowRight,
  Paperclip,
  Sparkles,
  Sliders,
  Clock,
} from 'lucide-react';
import type { Organ } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn, formatBytes } from '@/lib/utils';
import { SAMPLE_CASES, type SampleCase } from '@/lib/sampleCases';
import { ClaudeThinkingPill } from '@/components/ClaudeThinkingPill';

type OrganChoice = Organ | 'auto';

const ACCEPT_ATTR =
  '.png,.jpg,.jpeg,.webp,.dcm,.nii,.gz,.pdf,image/png,image/jpeg,image/webp,application/dicom,application/pdf';

const ORGAN_OPTIONS: Array<{ key: OrganChoice; label: string }> = [
  { key: 'auto', label: 'Auto (AI)' },
  { key: 'brain', label: 'Brain' },
  { key: 'lung', label: 'Lung' },
  { key: 'pancreas', label: 'Pancreas' },
  { key: 'breast', label: 'Breast' },
  { key: 'kidney', label: 'Kidney' },
  { key: 'skin', label: 'Skin' },
  { key: 'general', label: 'General' },
];

function extOf(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.nii.gz')) return '.nii.gz';
  const i = lower.lastIndexOf('.');
  return i === -1 ? '' : lower.slice(i);
}

async function makePreview(file: File): Promise<string | null> {
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

const THINKING_STAGES = [
  'Inspecting radiological pixel matrix with Google Gemini Vision...',
  'Extracting clinical entities & verifying negation boundaries...',
  'Computing RECIST 1.1 dimensions & lesion surface area...',
  'Synthesizing multi-agent clinical consensus & differential diagnoses...',
  'Cross-referencing NCCN oncologic management pathways...',
];

export function UploadForm() {
  const router = useRouter();

  const [organChoice, setOrganChoice] = React.useState<OrganChoice>('auto');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [stageIndex, setStageIndex] = React.useState(0);
  const [thinkingStartMs, setThinkingStartMs] = React.useState<number | null>(null);
  const [activeSampleId, setActiveSampleId] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % THINKING_STAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [submitting]);

  const handleFile = async (f?: File | null) => {
    if (!f) return;
    setError(null);
    setActiveSampleId(null);
    const ext = extOf(f.name);

    if (ext === '.pdf' || f.type === 'application/pdf') {
      setPdfFile(f);
      return;
    }

    setImageFile(f);
    const prev = await makePreview(f);
    setImagePreview(prev);
  };

  const clearFile = () => {
    setImageFile(null);
    setImagePreview(null);
    setActiveSampleId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearPdf = () => {
    setPdfFile(null);
    setActiveSampleId(null);
  };

  const loadSampleCase = async (sample: SampleCase) => {
    try {
      setError(null);
      setActiveSampleId(sample.id);
      setOrganChoice(sample.organ);
      setNotes(sample.clinicalNotes);

      const res = await fetch(sample.imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], sample.fileName, { type: 'image/png' });

      setImageFile(file);
      setImagePreview(sample.imageDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasImage = Boolean(imageFile);
    const hasPdf = Boolean(pdfFile);
    const hasSymptoms = Boolean(notes.trim());

    if (!hasImage && !hasPdf && !hasSymptoms) {
      setError('Please provide a medical scan or describe clinical symptoms.');
      return;
    }

    setSubmitting(true);
    setThinkingStartMs(Date.now());
    setStageIndex(0);

    try {
      const form = new FormData();
      if (organChoice !== 'auto') {
        form.append('organ', organChoice);
      }
      if (notes.trim()) {
        form.append('notes', notes.trim());
      }
      if (imageFile) {
        form.append('image', imageFile);
        const preview = imagePreview || (await makePreview(imageFile));
        if (preview) form.append('imagePreview', preview);
      }
      if (pdfFile) {
        form.append('pdf', pdfFile);
      }

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
        /* fallback to server */
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

  const hasImage = Boolean(imageFile);
  const hasPdf = Boolean(pdfFile);
  const hasSymptoms = Boolean(notes.trim());
  const canSubmit = hasImage || hasPdf || hasSymptoms;

  return (
    <div className="w-full space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        disabled={submitting}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Claude Style Input Box */}
      <form
        onSubmit={onSubmit}
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
          'claude-card rounded-2xl p-4 sm:p-5 transition-all duration-200 relative',
          dragOver && 'ring-2 ring-primary/50 bg-secondary/30',
        )}
      >
        {/* Attached Scan / PDF Chips */}
        {(imageFile || pdfFile) && (
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-border/60">
            {imageFile && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border text-xs font-mono">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Scan thumbnail"
                    className="w-5 h-5 rounded object-cover"
                  />
                ) : (
                  <FileImage className="w-4 h-4 text-primary" />
                )}
                <span className="truncate max-w-[200px] text-foreground/90 font-medium">
                  {imageFile.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({formatBytes(imageFile.size)})
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={submitting}
                  className="hover:text-foreground text-muted-foreground ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {pdfFile && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border text-xs font-mono">
                <FileText className="w-4 h-4 text-primary" />
                <span className="truncate max-w-[200px] text-foreground/90 font-medium">
                  {pdfFile.name}
                </span>
                <button
                  type="button"
                  onClick={clearPdf}
                  disabled={submitting}
                  className="hover:text-foreground text-muted-foreground ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Textarea for symptoms, presentation, notes */}
        <textarea
          rows={4}
          value={notes}
          disabled={submitting}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe patient symptoms, clinical history, or drag and drop a medical scan here..."
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none min-h-[90px] sm:min-h-[110px] leading-relaxed resize-y"
        />

        {/* Bottom Toolbar inside the Composer */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 pt-3 mt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-2">
            {/* Attach Scan / Document Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-border/50 hover:border-border select-none"
              title="Attach scan or PDF"
            >
              <Paperclip className="w-3.5 h-3.5 text-primary" />
              <span>Attach scan</span>
            </button>

            {/* Organ Target Selector */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-[11px] hidden sm:inline text-muted-foreground/80">Target:</span>
              <select
                value={organChoice}
                disabled={submitting}
                onChange={(e) => setOrganChoice(e.target.value as OrganChoice)}
                className="bg-secondary/70 hover:bg-secondary text-xs text-foreground/90 rounded-lg px-2.5 py-1.5 border border-border/60 focus:outline-none cursor-pointer transition-colors font-mono"
              >
                {ORGAN_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key} className="bg-card text-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button (Claude Round Terracotta Arrow) */}
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-150',
              canSubmit && !submitting
                ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm cursor-pointer'
                : 'bg-secondary text-muted-foreground/40 cursor-not-allowed',
            )}
            title="Start analysis"
          >
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </form>

      {/* Claude Thinking Wave when submitting */}
      {submitting && (
        <div className="py-2 text-center">
          <ClaudeThinkingPill
            isThinking={true}
            statusText={THINKING_STAGES[stageIndex]}
            elapsedMs={thinkingStartMs ? Date.now() - thinkingStartMs : 0}
          />
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs text-destructive font-mono">
          {error}
        </div>
      )}

      {/* Claude Style Sample Suggestions */}
      {!submitting && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-mono text-muted-foreground/80 mr-1 select-none">
            Preloaded cases:
          </span>
          <button
            type="button"
            onClick={() => loadSampleCase(positiveSample)}
            className={cn(
              'claude-pill px-3 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono select-none',
              activeSampleId === positiveSample.id && 'border-primary text-foreground bg-secondary',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            <span>Glioblastoma MRI</span>
          </button>

          <button
            type="button"
            onClick={() => loadSampleCase(lungSample)}
            className={cn(
              'claude-pill px-3 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono select-none',
              activeSampleId === lungSample.id && 'border-primary text-foreground bg-secondary',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span>Lung Nodule CT</span>
          </button>

          <button
            type="button"
            onClick={() => loadSampleCase(normalSample)}
            className={cn(
              'claude-pill px-3 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono select-none',
              activeSampleId === normalSample.id && 'border-primary text-foreground bg-secondary',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span>Normal Control</span>
          </button>
        </div>
      )}
    </div>
  );
}
