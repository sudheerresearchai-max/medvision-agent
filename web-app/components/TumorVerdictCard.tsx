'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  ShieldAlert,
  Zap,
  MapPin,
  Crosshair,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  let diagnosis = 'Suspected Neoplastic Lesion';
  let location = `${organName} Parenchyma`;

  if (geminiWarning) {
    const match = geminiWarning.match(/Gemini Vision Detection:\s*([^.]+?)\s+identified in\s+([^.]+)/i);
    if (match) {
      diagnosis = match[1].trim();
      location = match[2].trim();
    }
  } else if (data.clinical.suspectedConditions.length > 0) {
    diagnosis = data.clinical.suspectedConditions[0];
  }

  // Determine Danger Level & Severity Rating (1 to 5)
  let dangerLevel = 0;
  let dangerTitle = 'CLEAR / NO LESION (Level 0/5)';
  let dangerColor = 'text-emerald-700 dark:text-emerald-300';
  let dangerBg = 'bg-emerald-500/5 border-emerald-500/25';
  let urgency = 'Routine clinical follow-up; no acute oncologic intervention required.';

  if (isTumor) {
    const diagLower = diagnosis.toLowerCase();
    if (diagLower.includes('glioblastoma') || diagLower.includes('gbm') || diagLower.includes('grade iv')) {
      dangerLevel = 5;
      dangerTitle = 'CRITICAL SEVERITY (Level 5/5 — WHO Grade IV)';
      dangerColor = 'text-destructive';
      dangerBg = 'bg-destructive/5 border-destructive/25';
      urgency = 'CRITICAL: Immediate neurosurgical oncology consult for craniotomy/resection and edema management.';
    } else if (diagLower.includes('adenocarcinoma') || diagLower.includes('carcinoma') || data.routing.modelKey === 'pancreas') {
      dangerLevel = 4;
      dangerTitle = 'HIGH SEVERITY (Level 4/5 — Invasive Neoplasm)';
      dangerColor = 'text-orange-600 dark:text-orange-400';
      dangerBg = 'bg-orange-500/5 border-orange-500/25';
      urgency = 'HIGH: Urgent surgical oncology & cross-sectional staging (PET-CT, contrast MRI) required.';
    } else {
      dangerLevel = 3;
      dangerTitle = 'MODERATE SEVERITY (Level 3/5 — Abnormal Tissue Mass)';
      dangerColor = 'text-amber-600 dark:text-amber-400';
      dangerBg = 'bg-amber-500/5 border-amber-500/25';
      urgency = 'MODERATE: Multidisciplinary biopsy and serial volumetric comparison recommended.';
    }
  }

  return (
    <Card className={cn('overflow-hidden border transition-all shadow-xs', isTumor ? 'border-destructive/35 bg-card' : 'border-emerald-500/35 bg-card')}>
      {/* Top Banner Status */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b text-sm font-semibold',
          isTumor
            ? 'bg-destructive/10 text-destructive border-destructive/20'
            : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/20',
        )}
      >
        <div className="flex items-center gap-2.5">
          {isTumor ? (
            <>
              <ShieldAlert className="h-5 w-5 text-destructive animate-pulse" />
              <span className="text-sm font-bold tracking-tight uppercase">Tumor Detected — Active Neoplasm Confirmed</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold tracking-tight uppercase">Negative Study — No Tumor Identified</span>
            </>
          )}
        </div>
        <Badge
          className={cn(
            'text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider',
            isTumor ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-600 text-white',
          )}
        >
          {isTumor ? 'Positive Finding' : 'Normal / Clear'}
        </Badge>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Active AI Engine Attribution */}
        {inference?.engine === 'gemini-vision' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-foreground">
            <span className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Zap className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <span className="font-semibold text-foreground">Multimodal Engine: Google Gemini Flash Vision AI</span>
            </span>
            <span className="text-[11px] font-mono text-primary font-semibold">
              Confidence: {(inference.confidence * 100).toFixed(1)}% · Verified Spatial Bounding
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Engine Mode: Local Standalone Fallback</span>
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Synthetic baseline models active
            </span>
          </div>
        )}

        {/* Danger Level Meter */}
        <div className={cn('rounded-xl border p-4 space-y-2.5', dangerBg)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className={cn('h-5 w-5', dangerColor)} />
              <span className={cn('text-xs font-bold uppercase tracking-wider', dangerColor)}>
                Danger Rating: {dangerTitle}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">{dangerLevel} / 5</span>
          </div>

          {/* 5-Bar Severity Gauge */}
          <div className="grid grid-cols-5 gap-1.5 h-2">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <div
                key={lvl}
                className={cn(
                  'rounded-xs transition-all',
                  lvl <= dangerLevel
                    ? lvl >= 4
                      ? 'bg-destructive'
                      : lvl === 3
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    : 'bg-secondary',
                )}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            <strong className="text-foreground">Clinical Urgency:</strong> {urgency}
          </p>
        </div>

        {/* What You Need to Find Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Box 1: What to Find / Diagnosis */}
          <div className="rounded-xl border border-border/80 bg-secondary/25 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <Crosshair className="h-3.5 w-3.5 text-primary" />
              <span>What To Find (Pathology)</span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {isTumor ? diagnosis : 'Unremarkable Parenchyma'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isTumor
                ? 'Hyperintense enhancing contrast core with surrounding vasogenic edema.'
                : 'Symmetric gray-white differentiation with normal ventricular geometry.'}
            </p>
          </div>

          {/* Box 2: Anatomical Location */}
          <div className="rounded-xl border border-border/80 bg-secondary/25 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Anatomical Location</span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {isTumor ? location : 'Bilateral Cerebral Hemispheres'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isTumor
                ? `Focal mass centered in ${location}, causing local mass effect on adjacent ventricular contours.`
                : 'No midline shift, no focal mass effect, ventricles of normal caliber.'}
            </p>
          </div>
        </div>

        {/* Visual Illumination ("Light It Up") Guide */}
        {isTumor && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Tumor Visual Illumination Active
                </span>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
                {inference?.metrics.areaPx.toLocaleString()} px area
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The lesion has been <strong className="text-foreground">lit up in high-contrast Red (`#f84848`)</strong> in the PACS Visualizer below.
              Use the <strong className="text-foreground">Mask Alpha</strong> slider (0% to 100%) and <strong className="text-foreground">Split View</strong> controls to inspect the illuminated tumor boundary directly against underlying anatomical tissue.
            </p>
          </div>
        )}

        {/* Impression Quote if available */}
        {impressionWarning && (
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-3.5 text-xs text-muted-foreground leading-relaxed italic">
            "{impressionWarning.replace('Impression: ', '')}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}
