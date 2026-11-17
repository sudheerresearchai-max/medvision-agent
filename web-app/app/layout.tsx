import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Brain, Database, BookOpen, Home, Layers, Upload, FolderOpen } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Multi-Model Medical Vision Analysis using Agentic AI on Tumors and Medical',
    template: '%s · MedVision Agentic AI',
  },
  description:
    'Multi-model medical vision analysis using Agentic AI on tumors and medical scans. Autonomous multi-agent panel featuring Google Gemini Multimodal Vision, deep U-Net architectures, RECIST 1.1 biomarker morphometry, and clinical safety verification.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {/* Minimalist Top Header */}
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
          <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 transition-transform group-hover:scale-105">
                <Brain className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                  MedVision Agentic AI
                  <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-medium text-primary border border-primary/20">
                    5-Agent Swarm
                  </span>
                </span>
                <span className="hidden xl:inline text-[10px] font-normal text-muted-foreground truncate max-w-md">
                  Multi-Model Medical Vision Analysis using Agentic AI on Tumors and Medical
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-1.5 text-xs">
              <Link
                href="/"
                className="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Home className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Overview
              </Link>
              <Link
                href="/upload"
                className="rounded-md bg-primary/10 px-3 py-1.5 font-semibold text-primary transition-all hover:bg-primary/20 border border-primary/20"
              >
                <Upload className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Upload &amp; Analyze
              </Link>
              <Link
                href="/cases"
                className="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground hidden sm:inline-flex"
              >
                <FolderOpen className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Archive
              </Link>
              <Link
                href="/datasets"
                className="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground hidden md:inline-flex"
              >
                <Database className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Datasets
              </Link>
              <Link
                href="/docs"
                className="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground hidden lg:inline-flex"
              >
                <BookOpen className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Protocols
              </Link>
            </nav>
          </div>
        </header>

        <main className="container flex-1 py-8 px-4 sm:px-6">{children}</main>

        <footer className="border-t border-border/60 py-6 text-xs text-muted-foreground bg-secondary/20">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground tracking-tight">
                Multi-Model Medical Vision Analysis using Agentic AI on Tumors and Medical
              </p>
              <p className="text-[11px] text-muted-foreground">
                Autonomous Collaborative Medical Intelligence · Research Prototype (Not for Primary Clinical Diagnosis)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>Google Gemini Multimodal Vision AI</span>
              <span>·</span>
              <span>RECIST 1.1 Morphometry</span>
              <span>·</span>
              <span>Zero-False-Positive QA</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
