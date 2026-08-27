'use client';

import { CheckCircle2, Loader2, MinusCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { AgentStep } from '@/lib/types';
import { AGENT_PIPELINE } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_ICON: Record<AgentStep['status'], React.ReactNode> = {
  pending: <span className="inline-block h-4 w-4 rounded-full border border-muted-foreground/40" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />,
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />,
  error: <XCircle className="h-4 w-4 text-destructive" aria-hidden />,
  skipped: <MinusCircle className="h-4 w-4 text-muted-foreground" aria-hidden />,
};

function stepBadgeVariant(status: AgentStep['status']) {
  switch (status) {
    case 'ok': return 'success' as const;
    case 'warn': return 'warning' as const;
    case 'error': return 'destructive' as const;
    default: return 'secondary' as const;
  }
}

interface AgentStatusPanelProps {
  /**
   * Final trace from the server (after analysis). When omitted, an optimistic
   * in-progress view of the standard pipeline is shown while awaiting results.
   */
  steps?: AgentStep[];
  running?: boolean;
  className?: string;
}

export function AgentStatusPanel({ steps, running = false, className }: AgentStatusPanelProps) {
  const display: AgentStep[] =
    steps && steps.length > 0
      ? steps
      : AGENT_PIPELINE.map((p) => ({
          name: p.name,
          label: p.label,
          status: running ? 'running' : 'pending',
        }));

  const doneCount = display.filter((s) =>
    ['ok', 'warn', 'error', 'skipped'].includes(s.status),
  ).length;
  const progressPct = Math.round((doneCount / Math.max(1, display.length)) * 100);

  return (
    <Card className={cn('animate-fade-in', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Agent workflow</CardTitle>
          <span className="text-xs text-muted-foreground">
            {doneCount}/{display.length} steps
          </span>
        </div>
        <Progress value={progressPct} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        <ol className="space-y-1">
          {display.map((step) => (
            <li
              key={step.name}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/60"
            >
              <span className="mt-0.5 shrink-0">{STATUS_ICON[step.status]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{step.label}</span>
                  {step.durationMs !== undefined && step.status !== 'pending' && step.status !== 'running' && (
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {step.durationMs} ms
                    </span>
                  )}
                  {(step.status === 'warn' || step.status === 'error') && (
                    <Badge variant={stepBadgeVariant(step.status)} className="px-1.5 py-0 text-[10px]">
                      {step.status === 'error' ? 'failed' : 'attention'}
                    </Badge>
                  )}
                </div>
                {step.detail && (
                  <p className="break-words text-xs text-muted-foreground">{step.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
