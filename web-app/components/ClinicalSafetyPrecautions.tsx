'use client';

import * as React from 'react';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClinicalSafetyPrecautions({ className }: { className?: string }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className={cn('w-full max-w-2xl mx-auto text-center', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 text-[11px] font-mono text-muted-foreground/80 hover:text-foreground transition-colors py-1 px-3 rounded-full hover:bg-secondary/40 select-none"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-primary/80" />
        <span>Clinical Safety &amp; Non-Autonomous Protocols</span>
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isExpanded && (
        <div className="mt-2 text-left rounded-xl border border-border/70 bg-card/60 p-4 text-[11px] font-mono text-muted-foreground space-y-2 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <p>
            <strong className="text-foreground/90">• Research Prototype Only:</strong> Investigational decision support — not FDA/CE approved for primary diagnosis.
          </p>
          <p>
            <strong className="text-foreground/90">• Mandatory Physician Sign-off:</strong> All tumor segmentations and RECIST 1.1 boundaries require validation by a licensed radiologist.
          </p>
          <p>
            <strong className="text-foreground/90">• De-identification:</strong> Images are processed without PHI/PII retention in compliance with HIPAA Safe Harbor guidelines.
          </p>
        </div>
      )}
    </div>
  );
}
