'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  FileImage,
  FileText,
  X,
  ArrowRight,
  UploadCloud,
  Brain,
  Wind,
  Dna,
  Shield,
  Activity,
  Sparkles,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { Organ } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { DiagnosticReasoningPill } from '@/components/DiagnosticReasoningPill';
import { SAMPLE_CASES, type SampleCase } from '@/lib/sampleCases';

type OrganChoice = Organ | 'auto';

const ACCEPT_ATTR =
  '.png,.jpg,.jpeg,.webp,.dcm,.nii,.gz,.pdf,image/png,image/jpeg,image/webp,application/dicom,application/pdf';

const ORGAN_OPTIONS: Array<{ key: OrganChoice; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'auto', label: 'Auto (AI Triage)', icon: Activity },
  { key: 'brain', label: 'Brain (Neuro)', icon: Brain },
  { key: 'lung', label: 'Lung (Thoracic)', icon: Wind },
  { key: 'pancreas', label: 'Pancreas (Abdominal)', icon: Dna },
  { key: 'breast', label: 'Breast', icon: Shield },
  { key: 'liver', label: 'Liver', icon: Activity },
  { key: 'kidney', label: 'Kidney', icon: Activity },
  { key: 'skin', label: 'Skin', icon: Activity },
  { key: 'colon', label: 'Colon', icon: Activity },
  { key: 'prostate', label: 'Prostate', icon: Activity },
  { key: 'general', label: 'General / Other', icon: Activity },
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

function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
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
  const [selectedDemoId, setSelectedDemoId] = React.useState<string | null>(null);

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
    setSelectedDemoId(null);
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
    setSelectedDemoId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearPdf = () => {
    setPdfFile(null);
  };

  // 1-Click load a preloaded clinical benchmark scenario
  const loadBenchmarkCase = (demo: SampleCase) => {
    setError(null);
    setSelectedDemoId(demo.id);
    setOrganChoice(demo.organ);
    setNotes(demo.clinicalNotes);

    try {
      const file = dataUrlToFile(demo.imageDataUrl, demo.fileName);
      setImageFile(file);
      setImagePreview(demo.imageDataUrl);
    } catch (e) {
      console.error('Failed to parse synthetic scan:', e);
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

    if (imageFile && imageFile.size > 8 * 1024 * 1024) {
      setError(`Image exceeds 8 MB limit (${(imageFile.size / 1024 / 1024).toFixed(2)} MB). Please downscale or choose another scan.`);
      return;
    }
    if (pdfFile && pdfFile.size > 8 * 1024 * 1024) {
      setError(`PDF exceeds 8 MB limit (${(pdfFile.size / 1024 / 1024).toFixed(2)} MB).`);
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
        /* fallback */
      }
      router.push(`/case/${payload.result.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
      setSubmitting(false);
    }
  };

  const hasImage = Boolean(imageFile);
  const hasPdf = Boolean(pdfFile);
  const hasSymptoms = Boolean(notes.trim());
  const canSubmit = hasImage || hasPdf || hasSymptoms;

  return (
    <div className="w-full space-y-6">
      {/* 1-Click Clinical Benchmark Scenarios Ribbon */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground tracking-wide uppercase">
              1-Click Clinical Evaluation Scenarios
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Select a verified benchmark case to test the diagnostic pipeline instantly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {SAMPLE_CASES.slice(0, 5).map((demo) => {
            const isSelected = selectedDemoId === demo.id;
            return (
              <button
                key={demo.id}
                type="button"
                disabled={submitting}
                onClick={() => loadBenchmarkCase(demo)}
                className={cn(
                  'text-left p-3 rounded-xl border transition-all relative overflow-hidden group flex flex-col justify-between',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                    : 'border-border/80 bg-card hover:bg-secondary/60 hover:border-primary/40',
                )}
              >
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold',
                        demo.isControl
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                      )}
                    >
                      {demo.modality} · {demo.organ.toUpperCase()}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {demo.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                    {demo.diagnosis}
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>{demo.isControl ? 'Control (Clear)' : 'Lesion Positive'}</span>
                  <span className="text-primary font-medium group-hover:underline">Load &rarr;</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Diagnostic Workspace Composer */}
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
          'workstation-card rounded-2xl p-5 sm:p-6 transition-all duration-200 relative space-y-4',
          dragOver && 'ring-2 ring-primary/60 bg-primary/5',
        )}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          disabled={submitting}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {/* Top Dropzone / Upload Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-xs font-medium border border-border/80 hover:border-primary/50 transition-all select-none shadow-2xs"
            >
              <UploadCloud className="w-4 h-4 text-primary" />
              <span>Attach MRI / CT Scan or PDF</span>
            </button>
            <span className="text-xs text-muted-foreground hidden lg:inline">
              Drag &amp; drop DICOM, NIfTI (.nii.gz), PNG, JPEG, or clinical summary PDF
            </span>
          </div>

          {/* Anatomic Target Organ Picker */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium text-[11px] uppercase tracking-wider">
              Anatomic Target:
            </span>
            <select
              value={organChoice}
              disabled={submitting}
              onChange={(e) => setOrganChoice(e.target.value as OrganChoice)}
              className="bg-secondary text-xs text-foreground font-medium rounded-lg px-3 py-1.5 border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
            >
              {ORGAN_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key} className="bg-card text-foreground">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Attached Scan & Document Previews */}
        {(imageFile || pdfFile) && (
          <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/60">
            {imageFile && (
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-mono">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Scan thumbnail"
                    className="w-7 h-7 rounded object-cover border border-border/70"
                  />
                ) : (
                  <FileImage className="w-5 h-5 text-primary" />
                )}
                <div className="flex flex-col">
                  <span className="truncate max-w-[220px] text-foreground font-medium font-sans">
                    {imageFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatBytes(imageFile.size)} · Image Matrix Loaded
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={submitting}
                  className="hover:text-foreground text-muted-foreground ml-2 p-1 hover:bg-secondary rounded"
                  title="Remove scan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {pdfFile && (
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-mono">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex flex-col">
                  <span className="truncate max-w-[220px] text-foreground font-medium font-sans">
                    {pdfFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatBytes(pdfFile.size)} · Medical Records Document
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearPdf}
                  disabled={submitting}
                  className="hover:text-foreground text-muted-foreground ml-2 p-1 hover:bg-secondary rounded"
                  title="Remove document"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Clinical Presentation & History Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/80 flex items-center justify-between">
            <span>Clinical History, Patient Symptoms &amp; Radiological Findings</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              Negation-aware entity extraction active
            </span>
          </label>
          <textarea
            rows={4}
            value={notes}
            disabled={submitting}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 58-year-old male presenting with progressive morning headaches, focal weakness, and a 2.8 cm solitary contrast-enhancing mass in the right frontotemporal region with surrounding vasogenic edema. No prior radiation history."
            className="w-full rounded-xl bg-secondary/30 border border-border/80 p-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-h-[110px] leading-relaxed resize-y font-sans"
          />
        </div>

        {/* Bottom Clinical Submission Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span>Autonomous 5-Specialist Deliberation + RECIST 1.1 Quantification</span>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={cn(
              'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 select-none shadow-sm',
              canSubmit && !submitting
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-primary/20'
                : 'bg-secondary text-muted-foreground/50 cursor-not-allowed border border-border/40',
            )}
          >
            <span>Run Multimodal Analysis</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </form>

      {/* Diagnostic Deliberation Progress Widget */}
      {submitting && (
        <div className="py-2 text-center animate-fade-in">
          <DiagnosticReasoningPill
            isThinking={true}
            statusText={THINKING_STAGES[stageIndex]}
            elapsedMs={thinkingStartMs ? Date.now() - thinkingStartMs : 0}
          />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive font-mono flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
