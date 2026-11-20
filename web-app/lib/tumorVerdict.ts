/**
 * Pure client-safe Tumor Verdict & Danger Level Calibration Helper.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * This module contains ZERO Node.js / server dependencies so it can safely be
 * imported by both client components ('use client') and server orchestrators.
 */
import type { AnalysisResult } from './types';

export interface TumorVerdict {
  isTumor: boolean;
  diagnosis: string;
  location: string;
  dangerLevel: number; // 0 for normal baseline, 3 moderate, 4 high, 5 critical
  dangerTitle: string; // 'Clear / No Lesion (0/5)', 'Critical (Level 5/5)', etc.
  urgency: string;
}

export function calculateTumorVerdict(data: AnalysisResult): TumorVerdict {
  const inference = data.inference;
  const isTumor = Boolean(inference && inference.metrics.areaPx > 0);

  const organName = data.routing?.modelKey ? data.routing.modelKey.toUpperCase() : 'ORGAN';
  let diagnosis = isTumor ? 'Suspected Neoplasm' : 'Normal / Unremarkable';
  let location = `${organName} Parenchyma`;

  if (inference) {
    const geminiWarning = inference.warnings.find((w) => w.startsWith('Gemini Vision Detection:'));
    if (geminiWarning) {
      const match = geminiWarning.match(/Gemini Vision Detection:\s*([^.]+?)\s+identified in\s+([^.]+)/i);
      if (match) {
        diagnosis = match[1].trim();
        location = match[2].trim();
      }
    } else if (data.clinical?.suspectedConditions && data.clinical.suspectedConditions.length > 0) {
      diagnosis = data.clinical.suspectedConditions[0];
    }
  }

  // Determine Danger Level & Severity Rating (0 to 5)
  let dangerLevel = 0;
  let dangerTitle = 'Clear / No Lesion (0/5)';
  let urgency = 'Parenchymal contours within normal morphological limits. Routine follow-up.';

  if (isTumor) {
    const diagLower = diagnosis.toLowerCase();
    if (
      diagLower.includes('glioblastoma') ||
      diagLower.includes('gbm') ||
      diagLower.includes('glioma') ||
      diagLower.includes('grade iv') ||
      data.routing?.modelKey === 'brain'
    ) {
      dangerLevel = 5;
      dangerTitle = 'Critical (Level 5/5)';
      urgency = 'Immediate neurosurgical oncology evaluation for surgical resection and edema control.';
    } else if (
      diagLower.includes('adenocarcinoma') ||
      diagLower.includes('carcinoma') ||
      data.routing?.modelKey === 'pancreas'
    ) {
      dangerLevel = 4;
      dangerTitle = 'High (Level 4/5)';
      urgency = 'Urgent oncologic staging (PET-CT, contrast MRI) and multidisciplinary tumor board review.';
    } else {
      dangerLevel = 3;
      dangerTitle = 'Moderate (Level 3/5)';
      urgency = 'Diagnostic biopsy correlation and serial volumetric follow-up recommended.';
    }
  }

  return {
    isTumor,
    diagnosis,
    location,
    dangerLevel,
    dangerTitle,
    urgency,
  };
}
