'use client';

import * as React from 'react';
import {
  BookOpen,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Activity,
  Stethoscope,
  ExternalLink,
  CheckCircle2,
  FileText,
  Pill,
  Sparkles,
} from 'lucide-react';
import type { ClinicalKnowledgeBrief } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ClinicalKnowledgePanelProps {
  knowledge?: ClinicalKnowledgeBrief;
}

type TabKey = 'symptoms' | 'precautions' | 'pathology' | 'guidelines';

export function ClinicalKnowledgePanel({ knowledge }: ClinicalKnowledgePanelProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('symptoms');

  if (!knowledge) return null;

  const isNormal = /normal|negative|clear/i.test(knowledge.condition);

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs text-xs font-mono">
      {/* Header Strip */}
      <div className="border-b border-border/70 bg-secondary/30 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 select-none">
                <Sparkles className="w-3 h-3" /> Clinical Knowledge &amp; Oncology Intelligence
              </span>
              {knowledge.whoClassification && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-secondary text-foreground/80 border border-border/60">
                  {knowledge.whoClassification}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              {knowledge.condition}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
              {knowledge.summary}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-[10px] text-muted-foreground block font-sans">
              Evidence-based standard
            </span>
            <span className="text-[11px] font-semibold text-foreground">
              {knowledge.category}
            </span>
          </div>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('symptoms')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all select-none whitespace-nowrap',
              activeTab === 'symptoms'
                ? 'bg-card text-foreground shadow-2xs border border-border font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
            )}
          >
            ⚡ Symptoms &amp; Side Effects
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('precautions')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all select-none whitespace-nowrap',
              activeTab === 'precautions'
                ? 'bg-card text-foreground shadow-2xs border border-border font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
            )}
          >
            🛡️ Precautions &amp; Red Flags
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pathology')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all select-none whitespace-nowrap',
              activeTab === 'pathology'
                ? 'bg-card text-foreground shadow-2xs border border-border font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
            )}
          >
            🔬 Pathology &amp; Treatment
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guidelines')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all select-none whitespace-nowrap',
              activeTab === 'guidelines'
                ? 'bg-card text-foreground shadow-2xs border border-border font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
            )}
          >
            📚 Guidelines &amp; Citations
          </button>
        </div>
      </div>

      {/* Tab Content Panes */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* TAB 1: Symptoms & Side Effects */}
        {activeTab === 'symptoms' && (
          <div className="space-y-6 animate-in fade-in-50 duration-150">
            {/* Common Presenting Symptoms */}
            <div className="space-y-2.5">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Primary Manifestations &amp; Symptoms
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {knowledge.commonSymptoms.map((symptom, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-secondary/20"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-[11px] text-foreground/85 leading-relaxed">
                      {symptom}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disease vs Treatment Side Effects */}
            {!isNormal && knowledge.clinicalSideEffects && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/50">
                {/* Secondary Disease Complications */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Disease-Related Complications
                  </h4>
                  <ul className="space-y-2">
                    {knowledge.clinicalSideEffects.diseaseRelated.map((effect, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] text-muted-foreground leading-relaxed pl-3 border-l-2 border-amber-500/40"
                      >
                        {effect}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Treatment Toxicity & Adverse Effects */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-primary flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 shrink-0" />
                    Treatment-Related Toxicities &amp; Side Effects
                  </h4>
                  <ul className="space-y-2">
                    {knowledge.clinicalSideEffects.treatmentRelated.map((effect, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] text-muted-foreground leading-relaxed pl-3 border-l-2 border-primary/40"
                      >
                        {effect}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Precautions & Emergency Red Flags */}
        {activeTab === 'precautions' && (
          <div className="space-y-6 animate-in fade-in-50 duration-150">
            {/* Acute Emergency Red Flags */}
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs tracking-wider uppercase">
                <ShieldAlert className="w-4 h-4 animate-pulse shrink-0" />
                <span>Acute Emergency Red Flags (Immediate Referral / Intervention)</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {knowledge.emergencyRedFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-[11px] text-destructive/90 font-medium leading-relaxed"
                  >
                    <span className="font-bold mr-1">⚠️</span>
                    <span>{flag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mandatory Clinical Safety Precautions */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Mandatory Clinical Precautions &amp; Patient Safety Protocols
              </h4>
              <div className="space-y-2">
                {knowledge.mandatoryPrecautions.map((precaution, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border/70 bg-secondary/20 text-[11px] text-foreground/85 leading-relaxed"
                  >
                    <span className="font-mono text-primary font-bold">{idx + 1}.</span>
                    <span>{precaution}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Pathology & Treatment Modalities */}
        {activeTab === 'pathology' && (
          <div className="space-y-6 animate-in fade-in-50 duration-150">
            {/* Pathology Details */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-primary" />
                Histopathology &amp; Molecular Profiling
              </h4>
              <div className="p-4 rounded-xl border border-border/70 bg-secondary/15 text-[11px] text-muted-foreground leading-relaxed">
                {knowledge.pathologyDetails}
              </div>
            </div>

            {/* Evidence-Based Treatment Protocols */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Standard-of-Care Treatment Protocols
              </h4>
              <div className="space-y-2">
                {knowledge.treatmentModalities.map((tx, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-secondary/20 text-[11px] text-foreground/85 leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{tx}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Guidelines & Citations */}
        {activeTab === 'guidelines' && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Authoritative Oncology Guidelines &amp; Academic Registries
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {knowledge.sources.map((src, idx) => (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-3.5 rounded-xl border border-border/70 bg-card hover:bg-secondary/40 transition-all shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {src.name}
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {src.citation}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-mono bg-secondary text-muted-foreground">
                    {src.sourceType}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
