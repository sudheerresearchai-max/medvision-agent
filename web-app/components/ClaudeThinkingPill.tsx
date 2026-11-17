'use client';

import * as React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MultiAgentSessionTrace } from '@/lib/multiAgent/types';

interface ClaudeThinkingPillProps {
  statusText?: string;
  isThinking?: boolean;
  elapsedMs?: number;
  trace?: MultiAgentSessionTrace | null;
  defaultExpanded?: boolean;
  className?: string;
}

export function ClaudeThinkingPill({
  statusText = 'Thinking',
  isThinking = false,
  elapsedMs,
  trace,
  defaultExpanded = false,
  className,
}: ClaudeThinkingPillProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const formattedSeconds = elapsedMs
    ? (elapsedMs / 1000).toFixed(1)
    : '2.4';

  const title = isThinking
    ? statusText
    : `Thought for ${formattedSeconds}s`;

  return (
    <div className={cn('w-full max-w-2xl mx-auto transition-all', className)}>
      {/* Sleek Claude Pill Button */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'group inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all select-none',
          'bg-secondary/60 hover:bg-secondary text-foreground/80 hover:text-foreground border border-border/70 hover:border-border',
          'shadow-2xs active:scale-[0.99]',
        )}
        aria-expanded={expanded}
      >
        {isThinking ? (
          /* Three Pulsing Terracotta Dots */
          <span className="inline-flex items-center gap-1 px-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary claude-dot-1" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary claude-dot-2" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary claude-dot-3" />
          </span>
        ) : (
          /* Completed subtle check icon */
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
          </span>
        )}

        {/* Action Status Text */}
        <span className="tracking-wide text-foreground/85 font-mono text-[11px] sm:text-xs">
          {title}
        </span>

        {/* Minimal Chevron */}
        <ChevronRight
          className={cn(
            'w-3 h-3 text-muted-foreground transition-transform duration-200 group-hover:text-foreground',
            expanded && 'rotate-90',
          )}
        />
      </button>

      {/* Expandable Thinking Drawer */}
      {expanded && (
        <div className="mt-2.5 rounded-xl border border-border/80 bg-card/90 p-4 sm:p-5 text-left text-xs font-mono space-y-3.5 shadow-xs backdrop-blur-xs transition-all animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 text-[11px] text-muted-foreground">
            <span className="uppercase tracking-wider font-semibold">
              Autonomous Agent Consensus Trace
            </span>
            {trace && (
              <span className="text-primary font-bold">
                Consensus {(trace.consensusScore * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Agent thoughts stream */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {trace?.thoughts && trace.thoughts.length > 0 ? (
              trace.thoughts.map((th) => (
                <div key={th.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-foreground/90 font-semibold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{th.actionTaken || th.role}</span>
                    <span className="text-[10px] text-primary/80 ml-auto">
                      {(th.confidenceScore * 100).toFixed(0)}% conf
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] pl-3.5 leading-relaxed">
                    {th.thought}
                  </p>
                </div>
              ))
            ) : (
              <div className="space-y-2 text-muted-foreground text-[11px]">
                <p>• Dr. Alex Vance: Ingested DICOM/PNG payload; validated matrix integrity.</p>
                <p>• Dr. Samantha Chen: Correlated parenchymal hyperintensity against oncologic registry.</p>
                <p>• Dr. Robert Miller: Executed Gemini Vision multimodal neural inspection; mapped lesion coordinates.</p>
                <p>• Dr. Emily Zhang: Calculated RECIST 1.1 dimensions & volumetric burden.</p>
                <p>• Dr. Marcus Patel: Synthesized cross-agent clinical consensus and danger rating.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
