import Link from 'next/link';
import { Sparkles, ShieldCheck, ArrowRight, FolderOpen, BookOpen } from 'lucide-react';
import { UploadForm } from '@/components/UploadForm';
import { MULTI_AGENT_PROFILES } from '@/lib/multiAgent/types';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 py-4 sm:py-8">
      {/* Minimalist Header */}
      <section className="text-center space-y-3.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 border border-border/70 text-[11px] font-mono text-muted-foreground select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>Multimodal Agentic AI · Google Gemini Vision</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
          Multi model medical vision analysis using Agentic AI on tumors and medical
        </h1>

        <p className="text-xs sm:text-sm text-muted-foreground font-mono max-w-xl mx-auto leading-relaxed">
          Five specialized autonomous clinical agents collaborate to inspect cross-sectional scans, delineate neoplastic boundaries, and compute RECIST 1.1 biomarkers.
        </p>
      </section>

      {/* Primary Minimalist Workspace (Upload / Quick Scan / Claude Animation) */}
      <section className="rounded-3xl border border-border/80 bg-card/50 p-6 sm:p-8 backdrop-blur-xs shadow-xs">
        <UploadForm />
      </section>

      {/* Autonomous Clinical Specialist Panel (Understated Monospace Badges) */}
      <section className="pt-2 text-center space-y-3">
        <p className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground/80">
          5 Autonomous Clinical Specialist Agents
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Object.values(MULTI_AGENT_PROFILES).map((agent) => (
            <div
              key={agent.role}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 bg-secondary/40 text-[11px] font-mono text-foreground/80 select-none"
            >
              <span className="text-xs">{agent.avatarIcon}</span>
              <span className="font-medium">{agent.name}</span>
              <span className="text-muted-foreground/80 text-[10px]">({agent.specialty})</span>
            </div>
          ))}
        </div>
      </section>

      {/* Minimalist Navigation Links */}
      <div className="flex items-center justify-center gap-4 text-xs font-mono text-muted-foreground pt-2">
        <Link href="/cases" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5" /> Case Archive
        </Link>
        <span>·</span>
        <Link href="/docs" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> Protocols &amp; Architecture
        </Link>
      </div>
    </div>
  );
}
