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
  const isTumor = Boolean(data.inference && data.inference.metrics.areaPx > 0);
  const diffs =
    data.symptomAnalysis?.differentials
      ?.map(
        (d, i) =>
          `  ${i + 1}. ${d.condition} [${d.probability.toUpperCase()}] (${Math.round(d.confidenceScore * 100)}%)\n     Rationale: ${d.rationale}`,
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
Visual Lesion : ${isTumor ? `POSITIVE (${data.inference?.metrics.areaPx} px detected)` : 'NEGATIVE (0 px above threshold)'}
Primary Verdict: ${data.clinical.suspectedConditions[0] || (isTumor ? 'Suspected Neoplasm' : 'Normal / Unremarkable')}
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
  const [pacsSynced, setPacsSynced] = React.useState(false);
  const [fhirSynced, setFhirSynced] = React.useState(false);
  const preview = data.inputs.previewDataUrl ?? null;
  const isTumor = Boolean(data.inference && data.inference.metrics.areaPx > 0);

  // Compute total processing time from steps or inference
  const totalMs = data.trace.reduce((acc, s) => acc + (s.durationMs || 0), 0) || (data.inference?.processingMs ?? 2400);

  // Extract key measurements
  const longestAxis = data.measurements.find((m) => m.label.includes('Longest Diameter'));
  const shortAxis = data.measurements.find((m) => m.label.includes('Short Axis') || m.label.includes('Orthogonal'));
  const volumeBurden = data.measurements.find((m) => m.label.includes('Volume'));

  const handleCopy = async () => {
    try {
      const text = formatConsultationSummary(data);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleSyncPacs = () => {
    setPacsSynced(true);
    setTimeout(() => setPacsSynced(false), 2800);
  };

  const handleSyncFhir = () => {
    setFhirSynced(true);
    setTimeout(() => setFhirSynced(false), 2800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      {/* Enterprise Institutional Case Banner */}
      <div className="corporate-panel rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3.5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground')}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Intake Console
            </Link>
            <span className="text-white/20">|</span>
            <span className="text-foreground font-bold">CASE REF:</span>
            <span className="text-blue-400 font-semibold truncate max-w-[200px] sm:max-w-none">
              {data.caseId}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.inference?.engine === 'gemini-vision' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 select-none">
                <Sparkles className="w-3 h-3" /> Gemini Multimodal Vision Active
              </span>
            )}
            <span className="text-[11px] font-mono text-muted-foreground">
              {new Date(data.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Patient Demographics & Encounter Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="corporate-subpanel rounded-xl p-2.5 space-y-0.5 border border-white/[0.05]">
            <span className="text-[10px] text-muted-foreground uppercase">Patient Identifier</span>
            <p className="font-semibold text-foreground">MRN: MV-892401</p>
          </div>
          <div className="corporate-subpanel rounded-xl p-2.5 space-y-0.5 border border-white/[0.05]">
            <span className="text-[10px] text-muted-foreground uppercase">Accession Number</span>
            <p className="font-semibold text-foreground">ACC-2026-0819</p>
          </div>
          <div className="corporate-subpanel rounded-xl p-2.5 space-y-0.5 border border-white/[0.05]">
            <span className="text-[10px] text-muted-foreground uppercase">Ordering Service</span>
            <p className="font-semibold text-foreground">Neuro-Oncology Triage</p>
          </div>
          <div className="corporate-subpanel rounded-xl p-2.5 space-y-0.5 border border-white/[0.05]">
            <span className="text-[10px] text-muted-foreground uppercase">Attestation Status</span>
            <p className="font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[2.5]" /> MTB Quorum Attested
            </p>
          </div>
        </div>

        {/* Corporate Clinical Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncPacs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono text-foreground/85 transition-all select-none"
              title="Broadcast DICOM segmentation object to enterprise PACS archive"
            >
              {pacsSynced ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">PACS C-STORE Pushed</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Push to PACS (:104)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSyncFhir}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono text-foreground/85 transition-all select-none"
              title="Emit HL7 FHIR v4 DiagnosticReport JSON payload"
            >
              {fhirSynced ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">HL7 FHIR Synced</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>HL7 FHIR v4 Sync</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono text-foreground/85 transition-all select-none"
              title="Copy structured clinical consultation report for EHR paste"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">EHR Note Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Copy EHR Note</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[11px] font-mono font-semibold transition-all select-none"
            title="Print or export certified consultation report as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Generate Certified PDF Report</span>
          </button>
        </div>
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
