'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/lib/types';
import { calculateTumorVerdict } from '@/lib/agent';

interface TumorVerdictCardProps {
  data: AnalysisResult;
}

export function TumorVerdictCard({ data }: TumorVerdictCardProps) {
  const { isTumor, diagnosis, location, dangerLevel, dangerTitle, urgency } = calculateTumorVerdict(data);
  const impressionWarning = data.inference?.warnings.find((w) => w.startsWith('Impression:'));

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5 transition-all text-xs font-mono backdrop-blur-xs',
        isTumor
          ? 'border-destructive/40 bg-destructive/5 text-foreground'
          : 'border-emerald-500/30 bg-emerald-500/5 text-foreground',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isTumor ? (
            <div className="w-8 h-8 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-foreground">
                {isTumor ? diagnosis : 'Negative Study · Clear Scan'}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{location}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {impressionWarning
                ? impressionWarning.replace(/^Impression:\s*/i, '')
                : urgency}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 sm:self-center">
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider select-none border',
              isTumor
                ? 'border-destructive/30 bg-destructive/15 text-destructive'
                : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            )}
          >
            {dangerTitle}
          </span>
        </div>
      </div>
    </div>
  );
}
