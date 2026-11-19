'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Stethoscope, Sparkles, Copy, Check, Printer, Share2 } from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';
import { MaskOverlay } from '@/components/MaskOverlay';
import { ReportPanel } from '@/components/ReportPanel';
import { TumorVerdictCard } from '@/components/TumorVerdictCard';
import { ClaudeThinkingPill } from '@/components/ClaudeThinkingPill';
import { ClinicalKnowledgePanel } from '@/components/ClinicalKnowledgePanel';
import { ClinicalSafetyPrecautions } from '@/components/ClinicalSafetyPrecautions';
import { SymptomAnalysisCard } from '@/components/SymptomAnalysisCard';
import { cn } from '@/lib/utils';

function formatConsultationSummary(data: AnalysisResult): string {
  const isTumor = Boolean(data.inference && (data.inference.metrics?.areaPx ?? 0) > 0);
  const diffs =
    data.symptomAnalysis?.differentials
      ?.map(
        (d, i) =>
          `  ${i + 1}. ${d.condition} [${d.probability.toUpperCase()}] (${Math.round((d.confidenceScore ?? 0) * 100)}%)\n     Rationale: ${d.rationale}`,
      )
      .join('\n') || 'None recorded.';
  const imaging =
    data.symptomAnalysis?.recommendedImaging
      ?.map((im) => `  • ${im.modality} (${im.protocol})\n    Indication: ${im.indication} [${im.urgency}]`)
      .join('\n') || 'None recorded.';
  const labs =
    data.symptomAnalysis?.recommendedLabs
      ?.map((l) => `  • ${l.testName} [${l.priority}]: ${l.rationale}`)
      .join('\n') || 'None recorded.';
  const redFlags =
    data.symptomAnalysis?.clinicalRedFlags?.map((rf) => `  🚨 ${rf}`).join('\n') || 'None identified.';
  const plan =
    data.symptomAnalysis?.suggestedActionPlan?.map((p, i) => `  ${i + 1}. ${p}`).join('\n') || 'None recorded.';

  return `================================================================================
MEDVISION AGENTIC AI — MULTIMODAL CLINICAL CONSULTATION REPORT
================================================================================
Case UUID : ${data.caseId}
Timestamp : ${new Date(data.createdAt).toLocaleString()}
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
    window.print();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      {/* Claude Style Minimal Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 no-print font-mono text-xs">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>New analysis</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-muted-foreground truncate max-w-[160px] sm:max-w-none">
            {data.caseId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="claude-pill px-3 py-1 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            title="Copy consultation summary"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="claude-pill px-3 py-1 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            title="Print or export consultation report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Claude Thinking Accordion */}
      <div className="pt-1">
        <ClaudeThinkingPill
          isThinking={false}
          elapsedMs={totalMs}
          trace={data.multiAgentTrace}
          defaultExpanded={false}
        />
      </div>

      {/* Primary Diagnosis & Danger Verdict Strip */}
      <TumorVerdictCard data={data} />

      {/* Multimodal & Clinical Symptoms Reasoning Card */}
      {data.symptomAnalysis && (
        <SymptomAnalysisCard symptoms={data.symptomAnalysis} />
      )}

      {/* Interactive Scan Visualizer or Symptoms-Only Notification */}
      {data.inference ? (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <MaskOverlay
            originalSrc={preview}
            inference={data.inference}
            measurements={data.measurements}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-mono font-medium text-foreground">
            <Stethoscope className="w-4 h-4 text-primary" />
            <span>Clinical Symptoms Consultation (No Radiological Scan Attached)</span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground max-w-md mx-auto">
            The multi-agent panel completed differential diagnosis triage and recommended diagnostic imaging protocols detailed in the clinical workup above.
          </p>
        </div>
      )}

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

      {/* Authoritative Clinical Knowledge & Oncology Intelligence (Symptoms, Side Effects, Precautions & Red Flags) */}
      <ClinicalKnowledgePanel knowledge={data.clinicalKnowledge} />

      {/* Full Structured Medical Report */}
      <ReportPanel report={data.report} />

      {/* Understated Clinical Precautions (Collapsed) */}
      <div className="pt-2">
        <ClinicalSafetyPrecautions />
      </div>
    </div>
  );
}
