'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Stethoscope,
  Copy,
  Check,
  Printer,
  Share2,
  FileText,
  Activity,
  Layers,
  Sparkles,
  ShieldAlert,
  Clock,
  Ruler,
} from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';
import { MaskOverlay } from '@/components/MaskOverlay';
import { ReportPanel } from '@/components/ReportPanel';
import { TumorVerdictCard } from '@/components/TumorVerdictCard';
import { DiagnosticReasoningPill } from '@/components/DiagnosticReasoningPill';
import { ClinicalKnowledgePanel } from '@/components/ClinicalKnowledgePanel';
import { ClinicalSafetyPrecautions } from '@/components/ClinicalSafetyPrecautions';
import { SymptomAnalysisCard } from '@/components/SymptomAnalysisCard';
import { MultiAgentTrace } from '@/components/MultiAgentTrace';
import { cn } from '@/lib/utils';

function formatConsultationSummary(data: AnalysisResult): string {
  const isTumor = Boolean(data.inference && (data.inference.metrics?.areaPx ?? 0) > 0);
  const diffs =
    data.symptomAnalysis?.differentials
      ?.map(
        (d, i) =>
          `  ${i + 1}. ${d.condition} [${(d.probability ?? '').toUpperCase()}] (${Math.round((d.confidenceScore ?? 0) * 100)}%)\n     Rationale: ${d.rationale ?? 'N/A'}`,
      )
      .join('\n') || 'None recorded.';
  const imaging =
    data.symptomAnalysis?.recommendedImaging
      ?.map((im) => `  • ${im.modality} (${im.protocol ?? 'standard'})\n    Indication: ${im.indication ?? 'standard'} [${im.urgency ?? 'Routine'}]`)
      .join('\n') || 'None recorded.';
  const labs =
    data.symptomAnalysis?.recommendedLabs
      ?.map((l) => `  • ${l.testName} [${l.priority ?? 'Standard'}]: ${l.rationale ?? 'Clinical evaluation'}`)
      .join('\n') || 'None recorded.';
  const redFlags =
    data.symptomAnalysis?.clinicalRedFlags?.map((rf) => `  🚨 ${rf}`).join('\n') || 'None identified.';
  const plan =
    data.symptomAnalysis?.suggestedActionPlan?.map((p, i) => `  ${i + 1}. ${p}`).join('\n') || 'None recorded.';

  let formattedDate = 'N/A';
  try {
    formattedDate = data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A';
  } catch {
    formattedDate = String(data.createdAt || 'N/A');
  }

  return `================================================================================
MEDVISION AGENTIC AI — MULTIMODAL CLINICAL CONSULTATION REPORT
================================================================================
Case UUID : ${data.caseId}
Timestamp : ${formattedDate}
Modality  : ${data.routing.modelKey ? data.routing.modelKey.toUpperCase() : 'General Multimodal'}
Storage   : ${data.storage}

1. EXECUTIVE DIAGNOSTIC FINDINGS
--------------------------------------------------------------------------------
Visual Lesion : ${isTumor ? `POSITIVE (${data.inference?.metrics?.areaPx ?? 0} px detected)` : 'NEGATIVE (0 px above threshold)'}
Primary Verdict: ${data.clinical?.suspectedConditions?.[0] || (isTumor ? 'Suspected Neoplasm' : 'Normal / Unremarkable')}
Acuity Level  : ${data.symptomAnalysis?.acuityLevel ? data.symptomAnalysis.acuityLevel.toUpperCase() : 'ROUTINE'}

2. PATIENT SYMPTOMS & CLINICAL PRESENTATION
--------------------------------------------------------------------------------
${data.symptomAnalysis?.primaryComplaint || data.clinical.evidenceSnippets?.join(' ') || 'None provided.'}

3. MULTIMODAL CLINICAL-RADIOLOGICAL CONCORDANCE
--------------------------------------------------------------------------------
${data.symptomAnalysis?.multimodalConcordance?.summary || 'Standard visual inspection.'}

4. RANKED DIFFERENTIAL DIAGNOSES (MULTI-AGENT CONSENSUS)
--------------------------------------------------------------------------------
${diffs}

5. RECOMMENDED DIAGNOSTIC IMAGING ORDERS
--------------------------------------------------------------------------------
${imaging}

6. RECOMMENDED LABORATORY WORKUP
--------------------------------------------------------------------------------
${labs}

7. CLINICAL SYMPTOM RED FLAGS
--------------------------------------------------------------------------------
${redFlags}

8. SUGGESTED ACTION PLAN
--------------------------------------------------------------------------------
${plan}

================================================================================
DISCLAIMER: Investigational Research Prototype. NOT FDA cleared or CE marked.
All findings and segmentations require board-certified physician verification.
================================================================================`;
}

export function CaseView({ data }: { data: AnalysisResult }) {
  const [copied, setCopied] = React.useState(false);
  const preview = data.inputs.previewDataUrl ?? null;
  const isTumor = Boolean(data.inference && (data.inference.metrics?.areaPx ?? 0) > 0);

  // Compute total processing time from steps or inference
  const totalMs = data.trace.reduce((acc, s) => acc + (s.durationMs || 0), 0) || (data.inference?.processingMs ?? 2400);

  // Extract key measurements
  const longestAxis = data.measurements.find((m) => m.label.includes('Longest Diameter'));
  const shortAxis = data.measurements.find((m) => m.label.includes('Short Axis') || m.label.includes('Orthogonal'));
  const volumeBurden = data.measurements.find((m) => m.label.includes('Volume'));

  const handleCopy = async () => {
    try {
      const text = formatConsultationSummary(data);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Top Clinical Case Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4 no-print text-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary border border-transparent hover:border-border/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Diagnostic Studio</span>
          </Link>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground truncate max-w-[140px] sm:max-w-none">
              Case {data.caseId}
            </span>
            <span className="clinical-pill px-2.5 py-0.5 text-[11px] font-mono text-primary border-primary/30 bg-primary/10">
              {data.routing.modelKey ? data.routing.modelKey.toUpperCase() : 'MULTIMODAL'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="clinical-pill px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            title="Copy consultation summary"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied Note</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Consult Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="clinical-pill px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            title="Print or export consultation report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Deliberation Status Widget */}
      <div className="pt-0.5">
        <DiagnosticReasoningPill
          isThinking={false}
          elapsedMs={totalMs}
          trace={data.multiAgentTrace}
          defaultExpanded={false}
        />
      </div>

      {/* Ergonomic 2-Column Clinical Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Radiologic PACS Viewport & Calipers (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {data.inference ? (
            <MaskOverlay
              originalSrc={preview}
              inference={data.inference}
              measurements={data.measurements}
            />
          ) : (
            <div className="workstation-card rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <Stethoscope className="w-4 h-4 text-primary" />
                <span>Clinical Symptoms Consultation (No Radiological Scan Attached)</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                The multi-agent panel completed differential diagnosis triage and recommended diagnostic imaging protocols detailed in the clinical workup panel.
              </p>
            </div>
          )}

          {/* Quick RECIST 1.1 Biomarker Summary */}
          {isTumor && data.measurements.length > 0 && (
            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="workstation-card rounded-xl p-3.5 text-center space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                  RECIST Longest Axis
                </span>
                <p className="text-base font-bold text-foreground">
                  {longestAxis ? `${longestAxis.value} ${longestAxis.unit}` : 'Measurable Target'}
                </p>
              </div>

              <div className="workstation-card rounded-xl p-3.5 text-center space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                  Orthogonal Short Axis
                </span>
                <p className="text-base font-bold text-foreground">
                  {shortAxis ? `${shortAxis.value} ${shortAxis.unit}` : 'Cross-Sectional'}
                </p>
              </div>

              <div className="workstation-card rounded-xl p-3.5 text-center space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                  Volume Burden
                </span>
                <p className="text-base font-bold text-foreground">
                  {volumeBurden ? `${volumeBurden.value} ${volumeBurden.unit}` : 'Volumetric Est.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Specialist Consensus & Differential Diagnosis (Span 5) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Executive Verdict Strip */}
          <TumorVerdictCard data={data} />

          {/* Symptom & Multimodal Concordance Card */}
          {data.symptomAnalysis && (
            <SymptomAnalysisCard symptoms={data.symptomAnalysis} />
          )}

          {/* Clinical Knowledge & NCCN Insights */}
          <ClinicalKnowledgePanel knowledge={data.clinicalKnowledge} />
        </div>
      </div>

      {/* Lower Full-Width Diagnostic Modules */}
      <div className="space-y-6 pt-4 border-t border-border/60">
        {/* Multi-Agent Specialist Trace */}
        {data.multiAgentTrace && (
          <MultiAgentTrace trace={data.multiAgentTrace} />
        )}

        {/* Comprehensive Medical Report */}
        <ReportPanel report={data.report} />

        {/* Clinical Safety & Regulatory Precautions */}
        <ClinicalSafetyPrecautions />
      </div>
    </div>
  );
}
