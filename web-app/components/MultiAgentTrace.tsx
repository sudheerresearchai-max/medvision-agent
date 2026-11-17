'use client';

import * as React from 'react';
import {
  Users,
  FileCheck,
  Stethoscope,
  Scan,
  Ruler,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Terminal,
  Activity,
} from 'lucide-react';
import type { MultiAgentSessionTrace, AgentRole } from '@/lib/multiAgent/types';
import { MULTI_AGENT_PROFILES } from '@/lib/multiAgent/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MultiAgentTraceProps {
  trace?: MultiAgentSessionTrace;
}

export function MultiAgentTrace({ trace }: MultiAgentTraceProps) {
  const [expandedRole, setExpandedRole] = React.useState<AgentRole | null>('radiologist_vision_agent');
  const [showHandoffs, setShowHandoffs] = React.useState<boolean>(false);

  if (!trace) {
    return null;
  }

  const getAgentIcon = (role: AgentRole) => {
    switch (role) {
      case 'triage_agent':
        return <FileCheck className="h-4 w-4" />;
      case 'clinical_nlp_agent':
        return <Stethoscope className="h-4 w-4" />;
      case 'radiologist_vision_agent':
        return <Scan className="h-4 w-4" />;
      case 'biomarker_agent':
        return <Ruler className="h-4 w-4" />;
      case 'synthesis_scribe_agent':
        return <FileText className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <Card className="overflow-hidden border border-border/80 bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60 bg-secondary/15">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                Multi-Agent Clinical Consensus Panel
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                  5 Clinical Specialists
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Autonomous Collaborative Architecture · Observable Inter-Agent Reasoning Trace
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1 font-semibold text-foreground shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Consensus: {(trace.consensusScore * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Collaborative Pipeline Avatar Flow */}
        <div className="grid grid-cols-5 gap-1.5 p-2 rounded-xl border border-border/70 bg-secondary/25 text-center">
          {trace.agentsInvolved.map((role) => {
            const profile = MULTI_AGENT_PROFILES[role];
            const isExpanded = expandedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setExpandedRole(isExpanded ? null : role)}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-lg transition-all text-left relative',
                  isExpanded
                    ? 'bg-background shadow-xs ring-1 ring-primary border border-primary/30'
                    : 'hover:bg-background/60 opacity-85 hover:opacity-100',
                )}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-2xs mb-1"
                  style={{ backgroundColor: profile.color }}
                >
                  {getAgentIcon(role)}
                </div>
                <span className="text-[11px] font-semibold text-foreground truncate w-full text-center">
                  {profile.name.split(',')[0]}
                </span>
                <span className="text-[9px] text-muted-foreground truncate w-full text-center hidden sm:block">
                  {profile.title.split(' ')[0]}
                </span>
                <div className="absolute top-1 right-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Agent Deep-Dive Thought Drawer */}
        <div className="space-y-2.5">
          {trace.thoughts.map((thought) => {
            const profile = MULTI_AGENT_PROFILES[thought.role];
            const isOpen = expandedRole === thought.role;
            return (
              <div
                key={thought.id}
                className={cn(
                  'rounded-xl border transition-all overflow-hidden',
                  isOpen ? 'border-primary/40 bg-card shadow-xs' : 'border-border/60 bg-card/60 hover:border-border',
                )}
              >
                {/* Agent Header Accordion Button */}
                <button
                  type="button"
                  onClick={() => setExpandedRole(isOpen ? null : thought.role)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: profile.color }}
                    >
                      {getAgentIcon(thought.role)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground tracking-tight">{profile.name}</span>
                        <span className="text-[10px] text-muted-foreground hidden md:inline">({profile.title})</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/80 font-mono">
                          {thought.toolInvoked?.split('&')[0].trim()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {thought.actionTaken}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold hidden sm:inline">
                      Conf: {(thought.confidenceScore * 100).toFixed(0)}%
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Thought & Message Payload */}
                {isOpen && (
                  <div className="border-t border-border/60 bg-secondary/10 p-3.5 space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Specialized Clinical Role &amp; Mandate
                      </span>
                      <p className="rounded-lg bg-background p-2.5 font-mono text-[11px] text-muted-foreground border border-border/70 leading-relaxed">
                        {profile.systemPrompt}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                          <Terminal className="h-3 w-3" /> Cognitive Deliberation Trace
                        </span>
                        <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                          Anthropic Stream Format
                        </Badge>
                      </div>
                      <p className="whitespace-pre-wrap rounded-lg bg-background p-3 font-mono text-xs leading-relaxed text-foreground border border-primary/20 shadow-2xs">
                        {thought.thought}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg border border-border/70 bg-background p-2">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">Tools Dispatched</span>
                        <span className="font-semibold font-mono text-primary truncate block">{thought.toolInvoked}</span>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background p-2">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">Verified Synthesis</span>
                        <span className="font-semibold text-foreground truncate block">{thought.outputSummary}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Collapsible Inter-Agent Handoff Messages */}
        <div className="rounded-xl border border-border/70 bg-secondary/20 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowHandoffs(!showHandoffs)}
            className="flex w-full items-center justify-between p-2.5 text-left hover:bg-secondary/40 transition-colors font-medium text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Inter-Agent Cryptographic Handoff Trail</span>
              <span className="text-[10px] font-mono">({trace.handoffs.length} transfers)</span>
            </div>
            {showHandoffs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showHandoffs && (
            <div className="border-t border-border/60 bg-background p-3 space-y-2">
              {trace.handoffs.map((h, i) => {
                const fromMeta = MULTI_AGENT_PROFILES[h.fromRole];
                const toMeta = MULTI_AGENT_PROFILES[h.toRole];
                return (
                  <div key={i} className="flex items-start gap-2 p-2 rounded border border-border/60 text-[11px]">
                    <span className="font-semibold text-foreground shrink-0">{fromMeta.name.split(',')[0]}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="font-semibold text-foreground shrink-0">{toMeta.name.split(',')[0]}:</span>
                    <span className="text-muted-foreground truncate">{h.payloadSummary}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Consensus Verification Banner */}
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-emerald-900 dark:text-emerald-200 font-medium">
              {trace.finalConsensusSummary}
            </span>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold text-[10px] shrink-0">
            Validated Consensus
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
