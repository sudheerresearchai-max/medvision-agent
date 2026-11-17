'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Stethoscope, Sparkles } from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';
import { MaskOverlay } from '@/components/MaskOverlay';
import { ReportPanel } from '@/components/ReportPanel';
import { TumorVerdictCard } from '@/components/TumorVerdictCard';
import { ClaudeThinkingPill } from '@/components/ClaudeThinkingPill';
import { ClinicalSafetyPrecautions } from '@/components/ClinicalSafetyPrecautions';
import { cn } from '@/lib/utils';

export function CaseView({ data }: { data: AnalysisResult }) {
  const preview = data.inputs.previewDataUrl ?? null;
  const isTumor = Boolean(data.inference && data.inference.metrics.areaPx > 0);

  // Compute total processing time from steps or inference
  const totalMs = data.trace.reduce((acc, s) => acc + (s.durationMs || 0), 0) || (data.inference?.processingMs ?? 2400);

  // Extract key measurements
  const longestAxis = data.measurements.find((m) => m.label.includes('Longest Diameter'));
  const shortAxis = data.measurements.find((m) => m.label.includes('Short Axis') || m.label.includes('Orthogonal'));
  const volumeBurden = data.measurements.find((m) => m.label.includes('Volume'));

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {/* Sleek Minimalist Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Link
            href="/upload"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground')}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> New Analysis
          </Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-foreground/90 font-medium truncate max-w-[200px] sm:max-w-none">
            {data.caseId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {data.inference?.engine === 'gemini-vision' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 select-none">
              <Sparkles className="w-3 h-3" /> Gemini Multimodal Vision
            </span>
          )}
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            {new Date(data.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Primary Diagnosis & Danger Verdict Strip */}
      <TumorVerdictCard data={data} />

      {/* Interactive Scan Visualizer (Illuminated Red Mask) */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <MaskOverlay
          originalSrc={preview}
          inference={data.inference}
          measurements={data.measurements}
        />
      </div>

      {/* Authentic Claude Thinking Pill / Accordion */}
      <div className="py-1">
        <ClaudeThinkingPill
          isThinking={false}
          elapsedMs={totalMs}
          trace={data.multiAgentTrace}
          defaultExpanded={false}
        />
      </div>

      {/* Key RECIST 1.1 Biomarker Metric Strip (If tumor detected) */}
      {isTumor && data.measurements.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-center space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
              RECIST 1.1 Longest Axis
            </span>
            <p className="text-sm font-semibold text-foreground">
              {longestAxis ? `${longestAxis.value} ${longestAxis.unit}` : 'Measurable Target'}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-center space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
              Orthogonal Short Axis
            </span>
            <p className="text-sm font-semibold text-foreground">
              {shortAxis ? `${shortAxis.value} ${shortAxis.unit}` : 'Cross-Sectional'}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/70 bg-card/60 p-3 text-center space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
              Tumor Volume Burden
            </span>
            <p className="text-sm font-semibold text-foreground">
              {volumeBurden ? `${volumeBurden.value} ${volumeBurden.unit}` : 'Volumetric Approximation'}
            </p>
          </div>
        </div>
      )}

      {/* Full Structured Medical Report */}
      <ReportPanel report={data.report} />

      {/* Understated Clinical Precautions (Collapsed) */}
      <div className="pt-2">
        <ClinicalSafetyPrecautions />
      </div>
    </div>
  );
}
