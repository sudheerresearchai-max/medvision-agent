'use client';

import * as React from 'react';
import {
  Users,
  Bot,
  Brain,
  Stethoscope,
  Scan,
  Ruler,
  FileText,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { MultiAgentSessionTrace, AgentRole } from '@/lib/multiAgent/types';
import { MULTI_AGENT_PROFILES } from '@/lib/multiAgent/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MultiAgentTraceProps {
  trace?: MultiAgentSessionTrace;
}

export function MultiAgentTrace({ trace }: MultiAgentTraceProps) {
  const [expandedRole, setExpandedRole] = React.useState<AgentRole | null>('radiologist_vision_agent');

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
        return <Bot className="h-4 w-4" />;
    }
  };

  return (
    <Card className="overflow-hidden border-border/80 bg-gradient-to-b from-card to-secondary/10 shadow-xs">
      <CardHeader className="pb-3 border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Multi-Agent Clinical Consensus Engine
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  5 Agents Active
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Autonomous Collaborative Architecture · Observable Inter-Agent Reasoning Trace
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 font-semibold text-foreground shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Consensus: {(trace.consensusScore * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Collaborative Pipeline Avatar Flow */}
        <div className="grid grid-cols-5 gap-1.5 p-2 rounded-lg border bg-secondary/30 text-center">
          {trace.agentsInvolved.map((role, idx) => {
            const profile = MULTI_AGENT_PROFILES[role];
            const isExpanded = expandedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setExpandedRole(isExpanded ? null : role)}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-md transition-all text-left relative',
                  isExpanded
                    ? 'bg-background shadow-xs ring-1 ring-primary'
                    : 'hover:bg-background/60 opacity-85 hover:opacity-100',
                )}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-2xs mb-1"
                  style={{ backgroundColor: profile.color }}
                >
                  {getAgentIcon(role)}
                </div>
                <span className="text-[11px] font-bold text-foreground truncate w-full text-center">
                  {profile.name}
                </span>
                <span className="text-[9px] text-muted-foreground truncate w-full text-center hidden sm:block">
                  {profile.title.split(' ')[0]}
                </span>
                <div className="absolute top-1 right-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Agent Deep-Dive Thought Drawer */}
        <div className="space-y-3">
          {trace.thoughts.map((thought) => {
            const profile = MULTI_AGENT_PROFILES[thought.role];
            const isOpen = expandedRole === thought.role;
            return (
              <div
                key={thought.id}
                className={cn(
                  'rounded-lg border transition-all overflow-hidden',
                  isOpen ? 'border-primary/40 bg-card shadow-2xs' : 'border-border/60 bg-card/40',
                )}
              >
                {/* Agent Header Accordion Button */}
                <button
                  type="button"
                  onClick={() => setExpandedRole(isOpen ? null : thought.role)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: profile.color }}
                    >
                      {getAgentIcon(thought.role)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{profile.name}</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">({profile.title})</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {thought.toolInvoked?.split('&')[0].trim()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {thought.actionTaken}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold hidden md:inline">
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
                  <div className="border-t bg-secondary/15 p-3.5 space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Agent System Role &amp; Prompt
                      </span>
                      <p className="rounded bg-background p-2.5 font-mono text-[11px] text-muted-foreground border">
                        {profile.systemPrompt}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-1 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Cognitive Reasoning Thought Process
                      </span>
                      <p className="whitespace-pre-wrap rounded bg-background p-3 font-mono text-xs leading-relaxed text-foreground border border-primary/20 shadow-2xs">
                        {thought.thought}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded border bg-background p-2">
                        <span className="text-muted-foreground block text-[10px] uppercase">Tools Dispatched</span>
                        <span className="font-semibold font-mono text-primary">{thought.toolInvoked}</span>
                      </div>
                      <div className="rounded border bg-background p-2">
                        <span className="text-muted-foreground block text-[10px] uppercase">Agent Output Synthesis</span>
                        <span className="font-semibold text-foreground">{thought.outputSummary}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Consensus Verification Banner */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">
              {trace.finalConsensusSummary}
            </span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-none font-bold text-[10px] shrink-0">
            PASSED QA
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
