import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ShieldCheck, Database, FileText, Sparkles, Stethoscope, Terminal } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MedVision · Autonomous Multimodal Oncology & Medical Vision Workstation',
    template: '%s · MedVision',
  },
  description:
    'Multimodal clinical vision analysis, RECIST 1.1 lesion measurement, and autonomous multi-agent oncology differential consensus powered by Google Gemini Vision.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/25 selection:text-primary">
        {/* Clinical Top Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 sm:px-6">
            {/* Brand Logo & Clinical Badge */}
            <div className="flex items-center gap-4">
              <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30 group-hover:border-primary/60 transition-colors shadow-xs">
                  <Activity className="h-4.5 w-4.5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                    MedVision
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/25">
                      v2.0
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono leading-none">
                    Multimodal Oncology AI
                  </span>
                </div>
              </Link>

              {/* Status Indicator */}
              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-border/60 text-[11px] font-mono text-muted-foreground">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Gemini Vision</span>
                <span className="text-border">/</span>
                <span>RECIST 1.1</span>
                <span className="text-border">/</span>
                <span>5-Agent Panel</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-foreground/90 transition-colors hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60"
              >
                Diagnostic Studio
              </Link>
              <Link
                href="/cases"
                className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60"
              >
                Case Registry
              </Link>
              <Link
                href="/docs"
                className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 hidden sm:inline-flex"
              >
                Architecture &amp; Docs
              </Link>
              <Link
                href="/datasets"
                className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 hidden md:inline-flex"
              >
                Datasets
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">{children}</main>

        {/* Clinical Workspace Footer */}
        <footer className="border-t border-border/70 py-6 text-xs text-muted-foreground bg-card/40">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 text-[11px]">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
              <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                MedVision Clinical Decision Support
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span className="text-muted-foreground">
                Investigational research prototype. Not certified for autonomous clinical diagnosis.
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground/80">
              <span>Google Gemini 1.5</span>
              <span>·</span>
              <span>NCCN Guidelines</span>
              <span>·</span>
              <span>DICOM / NIfTI</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
