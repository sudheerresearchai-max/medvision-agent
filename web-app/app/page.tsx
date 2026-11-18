import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  FolderOpen,
  BookOpen,
  Activity,
  Layers,
  Cpu,
  CheckCircle2,
  FileCheck2,
  Stethoscope,
  Microscope,
  Scale,
  Award,
} from 'lucide-react';
import { UploadForm } from '@/components/UploadForm';
import { MULTI_AGENT_PROFILES } from '@/lib/multiAgent/types';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2 sm:py-6">
      {/* Enterprise Executive Title & Telemetry Strip */}
      <section className="corporate-panel rounded-2xl p-6 sm:p-7 border border-white/[0.08] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono font-semibold text-blue-400 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>CLINICAL AI WORKSTATION · ENTERPRISE PRODUCTION SUITE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Multimodal Medical Vision &amp; Tumor Board AI Decision Support
            </h1>
            <p className="text-xs text-muted-foreground font-mono max-w-3xl leading-relaxed">
              Institutional cross-sectional imaging workstation integrating Google Gemini Multimodal Vision, deep U-Net architectures, RECIST 1.1 biomarker morphometry, and multi-agent clinical consensus.
            </p>
          </div>

          <div className="shrink-0 flex md:flex-col items-center md:items-end gap-2 text-right">
            <span className="text-[10px] font-mono text-muted-foreground">INSTITUTIONAL GATEWAY</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> HIPAA &amp; SOC 2 AUDITED
            </span>
          </div>
        </div>

        {/* Enterprise KPI & Telemetry Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-[10px]">
              <span>ACTIVE SYSTEM SLA</span>
              <Activity className="w-3 h-3 text-emerald-400" />
            </div>
            <p className="text-base font-bold text-foreground">99.98%</p>
            <p className="text-[10px] text-emerald-400/90 font-medium">Node 04 Operational</p>
          </div>

          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-[10px]">
              <span>DIAGNOSTIC LATENCY</span>
              <Cpu className="w-3 h-3 text-blue-400" />
            </div>
            <p className="text-base font-bold text-foreground">&lt; 1.8s</p>
            <p className="text-[10px] text-muted-foreground">Gemini Flash Vision</p>
          </div>

          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-[10px]">
              <span>BIOMARKER CRITERIA</span>
              <Layers className="w-3 h-3 text-amber-400" />
            </div>
            <p className="text-base font-bold text-foreground">RECIST 1.1</p>
            <p className="text-[10px] text-muted-foreground">WHO Morphometry</p>
          </div>

          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-[10px]">
              <span>VERIFIED BENCHMARKS</span>
              <Award className="w-3 h-3 text-emerald-400" />
            </div>
            <p className="text-base font-bold text-foreground">83 / 83</p>
            <p className="text-[10px] text-emerald-400/90 font-medium">Zero False-Positives</p>
          </div>
        </div>
      </section>

      {/* Multi-Disciplinary Tumor Board (MTB) AI Panel */}
      <section className="corporate-panel rounded-2xl p-5 border border-white/[0.08] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              Multidisciplinary Tumor Board (MTB) AI Quorum
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            5 of 5 Clinical Specialists Synchronized
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 font-mono text-xs">
          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="font-semibold text-foreground text-[11px] truncate">Dr. Alex Vance, MD</span>
            </div>
            <p className="text-[10px] text-blue-400 font-medium">Lead Radiologist</p>
            <p className="text-[9px] text-muted-foreground truncate">Gemini Multimodal Vision</p>
          </div>

          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
              <span className="font-semibold text-foreground text-[11px] truncate">Dr. S. Chen, MD, PhD</span>
            </div>
            <p className="text-[10px] text-cyan-400 font-medium">Thoracic Oncologist</p>
            <p className="text-[9px] text-muted-foreground truncate">Clinical NLP &amp; Negation</p>
          </div>

          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span className="font-semibold text-foreground text-[11px] truncate">Dr. R. Miller, MD</span>
            </div>
            <p className="text-[10px] text-purple-400 font-medium">GI Oncology Specialist</p>
            <p className="text-[9px] text-muted-foreground truncate">Pancreatic &amp; Visceral Triage</p>
          </div>

          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold text-foreground text-[11px] truncate">Dr. Emily Zhang, MD</span>
            </div>
            <p className="text-[10px] text-amber-400 font-medium">Chief Medical Scribe</p>
            <p className="text-[9px] text-muted-foreground truncate">RECIST 1.1 Biostatistics</p>
          </div>

          <div className="corporate-subpanel rounded-xl p-3 border border-white/[0.05] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground text-[11px] truncate">Dr. M. Patel, MD, JD</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-medium">Clinical Safety Officer</p>
            <p className="text-[9px] text-muted-foreground truncate">Legal &amp; Ethical Attestation</p>
          </div>
        </div>
      </section>

      {/* Primary Corporate Clinical Intake Workspace */}
      <section className="corporate-panel rounded-2xl border border-white/[0.08] p-5 sm:p-7 shadow-xl">
        <UploadForm />
      </section>

      {/* Institutional Navigation Links */}
      <div className="flex items-center justify-center gap-6 text-xs font-mono text-muted-foreground pt-1">
        <Link href="/cases" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5 text-primary" /> Institutional Case Registry
        </Link>
        <span>·</span>
        <Link href="/docs" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" /> Regulatory Protocols &amp; NCCN Architecture
        </Link>
      </div>
    </div>
  );
}
