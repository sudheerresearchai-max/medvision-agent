'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/lib/types';

interface TumorVerdictCardProps {
  data: AnalysisResult;
}

export function TumorVerdictCard({ data }: TumorVerdictCardProps) {
  const inference = data.inference;
  const isTumor = Boolean(inference && inference.metrics.areaPx > 0);

  // Extract diagnosis & location hints from Gemini warnings, clinical info, or organ default
  const geminiWarning = inference?.warnings.find((w) => w.startsWith('Gemini Vision Detection:'));
  const impressionWarning = inference?.warnings.find((w) => w.startsWith('Impression:'));

  const organName = data.routing.modelKey ? data.routing.modelKey.toUpperCase() : 'ORGAN';
  let diagnosis = isTumor ? 'Suspected Neoplasm' : 'Normal / Unremarkable';
  let location = `${organName} Parenchyma`;

  const isSymptomsOnly = !inference && Boolean(data.symptomAnalysis);
  const symptomTop = data.symptomAnalysis?.differentials?.[0];
  const symptomAcuity = data.symptomAnalysis?.acuityLevel;

  if (geminiWarning) {
    const match = geminiWarning.match(/Gemini Vision Detection:\s*([^.]+?)\s+identified in\s+([^.]+)/i);
    if (match) {
      diagnosis = match[1].trim();
      location = match[2].trim();
    }
  } else if (isSymptomsOnly && symptomTop) {
    diagnosis = symptomTop.condition;
    location = symptomTop.organSystem;
  } else if (data.clinical.suspectedConditions.length > 0) {
    diagnosis = data.clinical.suspectedConditions[0];
  }

  // Determine Danger Level & Severity Rating (1 to 5)
  let dangerLevel = 0;
  let dangerTitle = 'Clear / No Lesion (0/5)';
  let urgency = 'Parenchymal contours within normal morphological limits. Routine follow-up.';

  if (isSymptomsOnly && symptomTop) {
    if (symptomAcuity === 'emergency') {
      dangerLevel = 5;
      dangerTitle = 'Emergency Acuity (Level 5/5)';
      urgency = 'Immediate emergency department / specialist referral indicated. Stat diagnostic cross-sectional imaging required.';
    } else if (symptomAcuity === 'urgent') {
      dangerLevel = 3;
      dangerTitle = 'Urgent Workup (Level 3/5)';
      urgency = 'Prompt outpatient specialist consultation and scheduled diagnostic imaging recommended.';
    } else {
      dangerLevel = 0;
      dangerTitle = 'Routine Baseline (Level 0/5)';
      urgency = 'Symptoms consistent with non-acute etiology. Routine primary care follow-up indicated.';
    }
  } else if (isTumor) {
    const diagLower = diagnosis.toLowerCase();
    if (diagLower.includes('glioblastoma') || diagLower.includes('gbm') || diagLower.includes('grade iv')) {
      dangerLevel = 5;
      dangerTitle = 'Critical (Level 5/5)';
      urgency = 'Immediate neurosurgical oncology evaluation for surgical resection and edema control.';
    } else if (diagLower.includes('adenocarcinoma') || diagLower.includes('carcinoma') || data.routing.modelKey === 'pancreas') {
      dangerLevel = 4;
      dangerTitle = 'High (Level 4/5)';
      urgency = 'Urgent oncologic staging (PET-CT, contrast MRI) and multidisciplinary tumor board review.';
    } else {
      dangerLevel = 3;
      dangerTitle = 'Moderate (Level 3/5)';
      urgency = 'Diagnostic biopsy correlation and serial volumetric follow-up recommended.';
    }
  }

  const isAlert = isTumor || (isSymptomsOnly && (symptomAcuity === 'emergency' || symptomAcuity === 'urgent'));

  // Tiered severity theme colors (prevents moderate findings from triggering panic red)
  const severityTheme =
    dangerLevel === 5
      ? {
          cardBorder: 'border-red-500/40 bg-red-500/5',
          iconBg: 'bg-red-500/15 text-red-400',
          badge: 'border-red-500/30 bg-red-500/15 text-red-400',
        }
      : dangerLevel === 4
        ? {
            cardBorder: 'border-orange-500/40 bg-orange-500/5',
            iconBg: 'bg-orange-500/15 text-orange-400',
            badge: 'border-orange-500/30 bg-orange-500/15 text-orange-400',
          }
        : dangerLevel === 3
          ? {
              cardBorder: 'border-amber-500/35 bg-amber-500/5',
              iconBg: 'bg-amber-500/15 text-amber-400',
              badge: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
            }
          : {
              cardBorder: 'border-emerald-500/30 bg-emerald-500/5',
              iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
              badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            };

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5 transition-all text-xs font-mono backdrop-blur-xs',
        severityTheme.cardBorder,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isAlert ? (
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', severityTheme.iconBg)}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          ) : (
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', severityTheme.iconBg)}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-foreground">
                {isSymptomsOnly ? diagnosis : isTumor ? diagnosis : 'Negative Study · Clear Scan'}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{location}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {impressionWarning
                ? impressionWarning.replace(/^Impression:\s*/i, '')
                : urgency}
            </p>
            {isTumor && (
              <p className="text-[10px] text-muted-foreground/75 mt-1">
                💡 Suspected lesion illuminated in red on the scan. Use PACS controls below to toggle visibility or change color palette (Cyan, Amber, Emerald).
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 sm:self-center">
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider select-none border',
              severityTheme.badge,
            )}
          >
            {isSymptomsOnly
              ? symptomAcuity === 'emergency'
                ? 'EMERGENCY TRIAGE'
                : symptomAcuity === 'urgent'
                  ? 'URGENT WORKUP'
                  : 'ROUTINE EVALUATION'
              : isTumor
                ? dangerLevel === 5 ? 'CRITICAL LESION' : 'TUMOR DETECTED'
                : 'NORMAL / CLEAR'}
          </span>
          <span className="text-[10px] text-muted-foreground border border-border/70 rounded-full px-2 py-0.5 select-none">
            {dangerTitle}
          </span>
        </div>
      </div>
    </div>
  );
  );
}
