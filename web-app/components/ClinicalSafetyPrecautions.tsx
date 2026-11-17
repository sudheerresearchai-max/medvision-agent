'use client';

import * as React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  HelpCircle,
  Info,
  Lock,
  Radio,
  Scale,
  ShieldCheck,
  Stethoscope,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ClinicalSafetyPrecautions() {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <Card className="border border-border/80 bg-card shadow-xs overflow-hidden">
      <CardHeader
        className="cursor-pointer select-none bg-secondary/30 py-3.5 px-5 transition-colors hover:bg-secondary/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                Clinical Operating Instructions &amp; Safety Precautions
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Mandatory protocols for interpreting AI tumor segmentations, visual illumination, and risk ratings.
              </CardDescription>
            </div>
          </div>
          <button type="button" className="text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-5 space-y-6 text-xs text-muted-foreground leading-relaxed">
          {/* Section 1: Crucial Safety Precautions & Disclaimers */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Safety Precautions &amp; Regulatory Notice</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-xs">
              <li>
                <strong>Research Prototype Only:</strong> MedVision Agent is an investigational decision-support tool. It is <strong>NOT FDA cleared, CE marked, or approved for primary clinical diagnosis</strong>.
              </li>
              <li>
                <strong>No Autonomous Treatment Decisions:</strong> Never initiate chemotherapy, radiotherapy, or surgical intervention solely based on automated AI outputs.
              </li>
              <li>
                <strong>Mandatory Physician Review:</strong> All lesion segmentations, boundaries, and measurements must be verified and signed off by a board-certified radiologist or neurosurgical oncologist.
              </li>
              <li>
                <strong>Privacy &amp; PHI:</strong> Ensure all uploads are de-identified in compliance with HIPAA Safe Harbor and GDPR guidelines before processing.
              </li>
            </ul>
          </div>

          {/* Section 2: Step-by-Step Operating Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Step-by-Step Radiological Verification Protocol</span>
            </h4>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-secondary/20 p-3 space-y-1">
                <span className="font-bold text-foreground block">1. Inspect Illumination</span>
                <p>
                  Verify that the red illuminated mask (`#f84848`) aligns with contrast enhancement and excludes normal skull, bone, and choroid plexus.
                </p>
              </div>

              <div className="rounded-lg border bg-secondary/20 p-3 space-y-1">
                <span className="font-bold text-foreground block">2. Differentiate Edema</span>
                <p>
                  Differentiate the hyperintense enhancing tumor core from hypointense T1 / hyperintense FLAIR perilesional vasogenic edema.
                </p>
              </div>

              <div className="rounded-lg border bg-secondary/20 p-3 space-y-1">
                <span className="font-bold text-foreground block">3. Review RECIST 1.1</span>
                <p>
                  Confirm longest diameter and perpendicular axis in millimeters against physical slice thickness (if DICOM spacing is present).
                </p>
              </div>

              <div className="rounded-lg border bg-secondary/20 p-3 space-y-1">
                <span className="font-bold text-foreground block">4. Audit Multi-Agent Log</span>
                <p>
                  Review the consensus trace across Dr. Triage, Dr. Lexicon NLP, Dr. Vision AI, Dr. Metric AI, and the Chief Scribe.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Acute Red-Flag Emergency Checklist */}
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <Radio className="h-4 w-4 animate-pulse" />
              <span>Acute Oncologic Red-Flag Checklist (Emergency Referral)</span>
            </h4>
            <div className="grid gap-2 sm:grid-cols-3 pt-1">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                <span><strong>Midline Shift &gt; 5 mm:</strong> Subfalcine herniation risk requiring urgent osmotic therapy.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                <span><strong>Ventricular Collapse:</strong> Entrapment of lateral ventricle leading to hydrocephalus.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                <span><strong>Uncal / Tonsillar Herniation:</strong> Effacement of basal cisterns requiring immediate neurosurgical decompression.</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
