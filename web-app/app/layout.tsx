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
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {/* Anthropic Minimalist Top Navigation */}
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
          <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/25 transition-transform group-hover:scale-105">
                <Brain className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  MedVision <span className="font-normal text-muted-foreground">AI</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-medium text-primary border border-primary/20">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  5 Autonomous Agents
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono">
              <Link
                href="/"
                className="rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/60"
              >
                Overview
              </Link>
              <Link
                href="/upload"
                className="rounded-full bg-primary px-3.5 py-1.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow-2xs"
              >
                Upload &amp; Analyze
              </Link>
              <Link
                href="/cases"
                className="rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/60 hidden sm:inline-flex"
              >
                Archive
              </Link>
              <Link
                href="/docs"
                className="rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/60 hidden md:inline-flex"
              >
                Protocols
              </Link>
            </nav>
          </div>
        </header>

        <main className="container flex-1 py-8 px-4 sm:px-6">{children}</main>

        <footer className="border-t border-border/70 py-8 text-xs font-mono text-muted-foreground bg-card/40">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-medium text-foreground tracking-tight">
                Multi model medical vision analysis using Agentic AI on tumors and medical
              </p>
              <p className="text-[11px] text-muted-foreground">
                Autonomous clinical oncology decision support · Investigational research prototype
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground select-none">
              <span>Google Gemini Vision</span>
              <span>·</span>
              <span>RECIST 1.1</span>
              <span>·</span>
              <span>NCCN Guidelines</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
