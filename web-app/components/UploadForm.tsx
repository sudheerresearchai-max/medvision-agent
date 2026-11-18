'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileImage,
  FileText,
  X,
  ArrowRight,
  Sparkles,
  Stethoscope,
  Eye,
  Sliders,
  CheckCircle,
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
  '.png,.jpg,.jpeg,.webp,.dcm,.nii,.gz,.pdf,image/png,image/jpeg,image/webp,application/dicom,application/pdf';

const ORGAN_OPTIONS: Array<{ key: OrganChoice; label: string; icon: string }> = [
  { key: 'auto', label: 'Auto-Detect (AI)', icon: '✨' },
  { key: 'brain', label: 'Brain', icon: '🧠' },
  { key: 'lung', label: 'Lung', icon: '🫁' },
  { key: 'pancreas', label: 'Pancreas', icon: '🩸' },
  { key: 'breast', label: 'Breast', icon: '🎀' },
  { key: 'kidney', label: 'Kidney / Renal', icon: '🔬' },
  { key: 'skin', label: 'Skin / Derm', icon: '☀️' },
  { key: 'general', label: 'General / Other', icon: '🩺' },
];

const SYMPTOM_PRESETS = [
  {
    id: 'neuro',
    icon: '🧠',
    label: 'Neuro / Brain',
    summary: 'Morning headache & focal seizure',
    text: '58-year-old male with 3-week progressive morning headache, new-onset focal motor seizure, and left upper extremity weakness. Denies fever or head trauma.',
    organ: 'brain' as Organ,
  },
  {
    id: 'lung',
    icon: '🫁',
    label: 'Thoracic / Lung',
    summary: 'Hemoptysis & dyspnea',
    text: '64-year-old female, 40 pack-year smoking history, presenting with persistent cough, mild hemoptysis for 2 weeks, and 12-lb unintentional weight loss.',
    organ: 'lung' as Organ,
  },
  {
    id: 'pancreas',
    icon: '🩸',
    label: 'GI / Pancreas',
    summary: 'Painless jaundice & tea urine',
    text: '61-year-old male presenting with progressive painless obstructive jaundice, pruritus, tea-colored dark urine, clay stools, and epigastric discomfort radiating to back.',
    organ: 'pancreas' as Organ,
  },
  {
    id: 'breast',
    icon: '🎀',
    label: 'Breast',
    summary: 'Palpable breast lump & retraction',
    text: '52-year-old female noticed a firm, non-tender palpable mass in the upper outer quadrant of the left breast with subtle overlying skin tethering.',
    organ: 'breast' as Organ,
  },
  {
    id: 'renal',
    icon: '🔬',
    label: 'Kidney / Renal',
    summary: 'Gross hematuria & flank pain',
    text: '59-year-old male presenting with painless macroscopic hematuria for 5 days and dull right flank discomfort. Denies dysuria or urinary frequency.',
    organ: 'kidney' as Organ,
  },
  {
    id: 'skin',
    icon: '☀️',
    label: 'Skin / Melanoma',
    summary: 'Asymmetric enlarging mole',
    text: '47-year-old male presents with an evolving 8mm pigmented cutaneous lesion on upper back showing asymmetry, irregular borders, and color variegation.',
    organ: 'skin' as Organ,
  },
  {
    id: 'routine',
    icon: '🟢',
    label: 'Routine Control',
    summary: 'Mild tension headache',
    text: '42-year-old female with mild intermittent band-like tension headache responsive to acetaminophen. Neurological examination completely unremarkable; routine baseline screening.',
    organ: 'brain' as Organ,
  },
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
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [activeSampleId, setActiveSampleId] = React.useState<string | null>(null);
  const [stageIndex, setStageIndex] = React.useState(0);
  const [thinkingStartMs, setThinkingStartMs] = React.useState<number | null>(null);

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
    setPdfFile(null);
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

    if (ext === '.pdf' || file.type === 'application/pdf') {
      if (file.size > PDF_MAX_BYTES) {
        setError(`PDF exceeds limit (${formatBytes(PDF_MAX_BYTES)}).`);
        return;
      }
      setPdfFile(file);
      return;
    }

    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) {
      setError(`Unsupported format "${ext || file.name}". Supported: PNG, JPG, WebP, DICOM (.dcm), NIfTI (.nii), and PDF.`);
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError(`Scan exceeds limit (${formatBytes(IMAGE_MAX_BYTES)}).`);
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

  const clearPdf = () => {
    setPdfFile(null);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const hasImage = Boolean(imageFile);
    const hasPdf = Boolean(pdfFile);
    const hasSymptoms = Boolean(notes.trim());

    if (!hasImage && !hasPdf && !hasSymptoms) {
      setError('Please provide at least one clinical input: symptoms in the text area, a radiological scan, or a clinical PDF report.');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('organ', organChoice);
      form.append('notes', notes);
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

  let buttonText = 'Analyze with Multi-Agent AI';
  if (hasImage && hasSymptoms) {
    buttonText = 'Analyze Multimodal Scan & Symptoms';
  } else if (hasImage) {
    buttonText = 'Analyze Medical Scan (Gemini Flash Vision)';
  } else if (hasSymptoms) {
    buttonText = 'Analyze Clinical Symptoms (Multi-Agent Panel)';
  } else if (hasPdf) {
    buttonText = 'Analyze Clinical PDF Document';
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Quick-Load Minimal Pills (Scan Presets) */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground text-[11px] font-mono mr-1">Preloaded Scans:</span>
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
        {/* Organ Selector Bar */}
        <div className="rounded-xl border border-border/70 bg-card/50 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono font-medium text-muted-foreground flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-primary" /> Target Anatomical System:
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {organChoice === 'auto' ? 'Auto-detected via AI' : `Pinned to ${organChoice.toUpperCase()}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {ORGAN_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={submitting}
                onClick={() => setOrganChoice(opt.key)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 border',
                  organChoice === opt.key
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border/50 bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Minimalist Drag-and-Drop Area for Scans & Documents */}
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
            'relative rounded-2xl border-2 border-dashed transition-all p-5 sm:p-6 text-center',
            dragOver
              ? 'border-primary bg-primary/5 scale-[1.005]'
              : imageFile || pdfFile
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
                  {formatBytes(imageFile.size)} · Visual lesion detection active
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
          ) : pdfFile ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
                <FileText className="w-8 h-8" />
              </div>
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-mono text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-sm">
                    {pdfFile.name}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {formatBytes(pdfFile.size)} · Clinical report document attached
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={clearPdf}
                className="ml-auto p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Remove PDF"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center justify-center gap-2.5">
              <input
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                disabled={submitting}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="w-10 h-10 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Upload scan slice or medical document (Optional if entering symptoms)
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Any anatomical scan (MRI, CT, X-Ray, WebP, PNG, JPG, DICOM) or Clinical PDF
                </p>
              </div>
            </label>
          )}
        </div>

        {/* Clinical Symptoms & Patient Presentation Narrative */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              <label htmlFor="symptoms-input" className="text-xs font-mono font-semibold text-foreground">
                Patient Symptoms &amp; Clinical Narrative (Accepts Any Symptoms)
              </label>
            </div>
            <div className="flex items-center gap-2">
              {notes && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setNotes('')}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors underline select-none"
                >
                  Clear text
                </button>
              )}
              <span className="text-[10px] font-mono text-muted-foreground">
                {notes.length > 0 ? `${notes.length} chars` : 'Multi-specialty symptom triage'}
              </span>
            </div>
          </div>

          {/* Quick Symptom Chips Across Specialties */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="text-[10px] font-mono text-muted-foreground self-center mr-1">Quick Clinical Profiles:</span>
            {SYMPTOM_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={submitting}
                onClick={() => {
                  setNotes(preset.text);
                  setOrganChoice(preset.organ);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/60 bg-secondary/50 hover:bg-secondary text-[11px] font-mono text-foreground/80 hover:text-foreground transition-all"
                title={preset.summary}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          <textarea
            id="symptoms-input"
            rows={4}
            value={notes}
            disabled={submitting}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type or paste any clinical symptoms, patient presentation, duration, history, or physical findings here (e.g. 'Severe morning headache, vomiting, progressive weakness' or 'Painless jaundice, dark urine' or 'Hemoptysis, chronic cough, weight loss' or 'Routine screening')..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-card hover:bg-card focus:bg-card text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary/60 transition-all resize-y leading-relaxed"
          />

          {hasImage && hasSymptoms && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-primary pt-0.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Multimodal Mode Active: Visual lesion illumination + clinical symptoms differential concordance</span>
            </div>
          )}
          {!hasImage && hasSymptoms && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-foreground/80 pt-0.5">
              <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Symptoms-Only Mode: Full multi-agent oncologic differential diagnosis &amp; recommended imaging orders</span>
            </div>
          )}
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
              disabled={!canSubmit}
              className="w-full sm:w-auto px-8 rounded-full font-mono text-xs tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-2"
            >
              {buttonText} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </form>

      {/* Understated Safety Note (Collapsed by default) */}
      <ClinicalSafetyPrecautions className="pt-2" />
    </div>
  );
}
