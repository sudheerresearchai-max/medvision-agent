import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Brain, Database, BookOpen, Home, Layers, Upload, FolderOpen, ShieldCheck, Activity, Server, Stethoscope, Lock, CheckCircle2 } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MedVision Health Enterprise™ · Clinical Multimodal Oncology AI Suite',
    template: '%s · MedVision Health Enterprise',
  },
  description:
    'Enterprise-grade clinical decision support suite for multimodal oncology analysis, cross-sectional tumor segmentation, RECIST 1.1 biomarker morphometry, and multi-agent tumor board review.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {/* Enterprise Top Telemetry & Compliance Strip */}
        <div className="border-b border-white/[0.06] bg-black/60 px-4 py-1 text-[10px] font-mono text-muted-foreground/80 hidden sm:block">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-foreground/85 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                MEMORIAL ONCOLOGY CONSORTIUM · NODE 04 (PRODUCTION)
              </span>
              <span className="text-white/20">|</span>
              <span className="flex items-center gap-1">
                <Server className="w-3 h-3 text-primary/70" /> PACS C-STORE :104 ONLINE
              </span>
              <span className="text-white/20">|</span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> HL7 FHIR v4: SYNCED
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400/90">
                <Lock className="w-3 h-3" /> HIPAA SAFE HARBOR · SOC 2 TYPE II
              </span>
              <span className="text-white/20">|</span>
              <span>UPTIME: 99.98%</span>
            </div>
          </div>
        </div>

        {/* Corporate Enterprise Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-background/85 backdrop-blur-2xl corporate-header">
          <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-3 transition-all duration-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs transition-transform duration-200 group-hover:scale-105">
                <Brain className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight text-foreground">
                    MEDVISION <span className="text-blue-400 font-semibold">ENTERPRISE</span>
                  </span>
                  <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-blue-400 border border-blue-500/30">
                    v4.2-LTS
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/80 tracking-tight">
                  Clinical Multimodal Decision Support Suite
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2 text-xs font-mono">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 font-medium text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/[0.05]"
              >
                Intake Console
              </Link>
              <Link
                href="/cases"
                className="rounded-lg px-3 py-1.5 font-medium text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/[0.05]"
              >
                PACS Archive
              </Link>
              <Link
                href="/docs"
                className="rounded-lg px-3 py-1.5 font-medium text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/[0.05] hidden md:inline-flex"
              >
                NCCN Protocols
              </Link>

              <div className="hidden lg:flex items-center gap-2 pl-3 ml-2 border-l border-white/[0.08]">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px]">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-foreground/90 font-medium">Dr. Alex Vance, MD</span>
                  <span className="text-muted-foreground text-[10px]">(Attending Radiologist)</span>
                </div>
              </div>
            </nav>
          </div>
        </header>

        <main className="container flex-1 py-6 px-4 sm:px-6">{children}</main>

        {/* Corporate Enterprise Footer with Compliance & Audit Badges */}
        <footer className="border-t border-white/[0.08] py-8 text-xs font-mono text-muted-foreground bg-card/60 corporate-subpanel">
          <div className="container space-y-4 px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground tracking-tight text-sm">
                    MEDVISION HEALTH SYSTEMS, INC.
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    FDA 21 CFR Part 11 Audit Trail Compliant
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Enterprise Multimodal AI Decision Support Platform · CE Mark Class IIb Investigational Architecture
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06]">
                  DICOM® 3.0 PS 3.1-2026
                </span>
                <span className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06]">
                  HL7® FHIR® Release 4
                </span>
                <span className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06]">
                  ISO 13485:2016 Certified
                </span>
                <span className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06]">
                  SOC 2 Type II
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground/80">
              <p>
                © 2026 MedVision Health Systems, Inc. Commercial &amp; Clinical Enterprise Edition.
              </p>
              <div className="flex items-center gap-3">
                <Link href="/docs" className="hover:text-foreground transition-colors">Compliance Protocols</Link>
                <span>·</span>
                <Link href="/cases" className="hover:text-foreground transition-colors">Audit Registry</Link>
                <span>·</span>
                <span className="text-foreground/90 font-medium">Model: Google Gemini Vision 1.5/3 Pro/Flash</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
