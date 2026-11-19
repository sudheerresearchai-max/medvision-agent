'use client';

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Flame,
  Layers,
  ListOrdered,
  Scan,
  ShieldAlert,
  Stethoscope,
  TestTube2,
  Workflow,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SymptomAnalysisResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SymptomAnalysisCardProps {
  symptoms?: SymptomAnalysisResult;
}

export function SymptomAnalysisCard({ symptoms }: SymptomAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (!symptoms) return null;

  const isEmergency = symptoms.acuityLevel === 'emergency';
  const isUrgent = symptoms.acuityLevel === 'urgent';

  const acuityBadgeClass = isEmergency
    ? 'border-destructive/40 bg-destructive/15 text-destructive'
    : isUrgent
      ? 'border-amber-500/40 bg-amber-500/15 text-amber-500'
      : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500';

  const acuityLabel = isEmergency
    ? '🚨 Emergency Clinical Acuity'
    : isUrgent
      ? '⚠️ Urgent Diagnostic Workup'
      : '🟢 Routine Screening / Baseline';

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs text-xs font-mono">
      {/* Header Banner */}
      <div className="border-b border-border/70 bg-secondary/30 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 select-none">
                <Stethoscope className="w-3 h-3" /> Multi-Agent Symptom &amp; Diagnostic Reasoning
              </span>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold select-none border',
                  acuityBadgeClass,
                )}
              >
                {acuityLabel}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight pt-0.5">
              {symptoms.primaryComplaint}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border/70 bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] transition-colors self-start sm:self-center select-none"
          >
            <span>{isExpanded ? 'Collapse' : 'Expand'} Details</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Multimodal Concordance Strip (When both Image + Symptoms are present) */}
        {symptoms.multimodalConcordance && (
          <div className="mt-3.5 flex items-start gap-2.5 p-3 rounded-xl border border-primary/25 bg-primary/5 text-foreground/90">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                Multimodal Clinical-Radiological Concordance
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {symptoms.multimodalConcordance.summary}
              </p>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Section 1: Ranked Differential Diagnoses */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-primary" />
              Ranked Differential Diagnoses (Multi-Agent Consensus)
            </h4>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(symptoms.differentials ?? []).map((diff, idx) => {
                const isHigh = diff.probability === 'high';
                const isMod = diff.probability === 'moderate';
                const probBadge = isHigh
                  ? 'border-destructive/30 bg-destructive/15 text-destructive'
                  : isMod
                    ? 'border-amber-500/30 bg-amber-500/15 text-amber-500'
                    : 'border-border bg-secondary text-muted-foreground';

                const confText =
                  typeof diff.confidenceScore === 'number'
                    ? `${(diff.confidenceScore * 100).toFixed(0)}%`
                    : '—';

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border/70 bg-secondary/15 flex flex-col justify-between space-y-2.5"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Rank #{idx + 1}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.2 rounded-full text-[9px] uppercase tracking-wider font-bold border',
                            probBadge,
                          )}
                        >
                          {diff.probability} ({confText})
                        </span>
                      </div>

                      <h5 className="font-semibold text-xs text-foreground tracking-tight">
                        {diff.condition}
                      </h5>

                      <span className="text-[10px] text-primary/80 block">
                        {diff.organSystem}
                      </span>

                      <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                        {diff.rationale}
                      </p>
                    </div>

                    {(diff.supportingSymptoms ?? []).length > 0 && (
                      <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground space-y-1">
                        <span className="font-semibold text-foreground/80 block">Key Support:</span>
                        <div className="flex flex-wrap gap-1">
                          {diff.supportingSymptoms.map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-secondary/80 text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Recommended Diagnostic Imaging Orders & Lab Tests */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/50">
            {/* Imaging Orders */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-primary" />
                Recommended Diagnostic Imaging Protocols
              </h4>

              <div className="space-y-2.5">
                {(symptoms.recommendedImaging ?? []).map((img, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border/70 bg-secondary/20 space-y-1.5 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{img.modality}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {img.urgency}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      <strong>Protocol:</strong> {img.protocol}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      <strong>Indication:</strong> {img.indication}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Lab Tests */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5">
                <TestTube2 className="w-3.5 h-3.5 text-primary" />
                Recommended Laboratory &amp; Biomarker Workup
              </h4>

              <div className="space-y-2.5">
                {(symptoms.recommendedLabs ?? []).map((lab, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border/70 bg-secondary/20 space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{lab.testName}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] uppercase font-mono bg-secondary text-muted-foreground border border-border/60">
                        {lab.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                      {lab.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Red Flags & Action Plan */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/50">
            {/* Red Flags */}
            <div className="rounded-xl border border-destructive/35 bg-destructive/5 p-4 space-y-2.5">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-destructive flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                Identified Symptom Red Flags
              </h4>
              <ul className="space-y-1.5 pl-4 list-disc text-[11px] text-destructive/90 leading-relaxed">
                {(symptoms.clinicalRedFlags ?? []).map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>

            {/* Action Plan */}
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-4 space-y-2.5">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Suggested Clinical Action Plan
              </h4>
              <ul className="space-y-1.5 pl-4 list-decimal text-[11px] text-foreground/85 leading-relaxed">
                {(symptoms.suggestedActionPlan ?? []).map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
