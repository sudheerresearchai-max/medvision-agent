'use client';

import * as React from 'react';
import { ChevronRight, Check, Activity, Clock, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MultiAgentSessionTrace } from '@/lib/multiAgent/types';

interface DiagnosticReasoningPillProps {
  statusText?: string;
  isThinking?: boolean;
  elapsedMs?: number;
  trace?: MultiAgentSessionTrace | null;
  defaultExpanded?: boolean;
  className?: string;
}

export function DiagnosticReasoningPill({
  statusText = 'Analyzing radiological matrix...',
  isThinking = false,
  elapsedMs,
  trace,
  defaultExpanded = false,
  className,
}: DiagnosticReasoningPillProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const formattedSeconds = elapsedMs
    ? (elapsedMs / 1000).toFixed(1)
    : '2.4';

  return (
    <div className={cn('w-full max-w-2xl mx-auto transition-all', className)}>
      {/* Interactive Status Pill Button */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'group inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium transition-all select-none',
          'bg-secondary/70 hover:bg-secondary text-foreground/90 hover:text-foreground border border-border/80 hover:border-primary/50',
          'shadow-xs active:scale-[0.99]',
        )}
        aria-expanded={expanded}
      >
        {isThinking ? (
          /* Diagnostic Pulse */
          <span className="inline-flex items-center gap-1.5 px-0.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-primary font-mono text-[11px] font-semibold tracking-wide uppercase">
              Clinical Panel Active
            </span>
          </span>
        ) : (
          /* Completed Check */
          <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
          </span>
        )}

        <span className="text-xs text-foreground/90 font-medium truncate max-w-[280px] sm:max-w-md">
          {isThinking ? statusText : `Deliberated in ${formattedSeconds}s`}
        </span>

        {trace && (
          <span className="text-[10px] text-muted-foreground font-mono bg-background/60 px-2 py-0.5 rounded-full border border-border/60">
            {trace.thoughts?.length ?? 5} specialist steps
          </span>
        )}

        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground',
            expanded && 'rotate-90',
          )}
        />
      </button>

      {/* Expanded Multi-Agent Thought Telemetry */}
      {expanded && trace && (
        <div className="mt-3 workstation-card rounded-xl p-4 text-left border border-border/80 bg-card/95 backdrop-blur-sm animate-fade-in space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <Terminal className="w-3.5 h-3.5" /> Specialist Deliberation Trace
            </span>
            <span>Session: {trace.sessionId?.slice(0, 8)}...</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {trace.thoughts?.map((t, idx) => (
              <div
                key={t.id || idx}
                className="p-2.5 rounded-lg bg-secondary/50 border border-border/60 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-primary text-[11px] uppercase tracking-wider">
                    {t.role.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    {Math.round(t.confidenceScore * 100)}% conf
                  </span>
                </div>
                <p className="text-[11px] text-foreground/90 leading-relaxed font-sans">
                  {t.thought}
                </p>
                {t.actionTaken && (
                  <div className="text-[10px] text-muted-foreground pt-0.5">
                    <span className="text-muted-foreground/70">Action:</span> {t.actionTaken}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Backwards-compatible export
export { DiagnosticReasoningPill as ClaudeThinkingPill };
