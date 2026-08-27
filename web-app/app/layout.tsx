import type { Metadata } from 'next';
import Link from 'next/link';
import { Brain, Database, BookOpen, Home, Layers } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Multi Agent Med AI — Clinical Oncology Platform',
    template: '%s · Multi Agent Med AI',
  },
  description:
    'Collaborative Multi-Agent AI system for automated brain, lung, and pancreatic tumor segmentation and RECIST 1.1 structured clinical reporting. B.Tech Capstone Project.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans">
        <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <Brain className="h-5 w-5 text-primary" aria-hidden />
              Multi&nbsp;Agent&nbsp;Med&nbsp;AI
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                v1.0
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Home className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Home
              </Link>
              <Link
                href="/upload"
                className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Upload &amp; Analyze
              </Link>
              <Link
                href="/cases"
                className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Study Archive
              </Link>
              <Link
                href="/datasets"
                className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Database className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Datasets
              </Link>
              <Link
                href="/docs"
                className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <BookOpen className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Docs
              </Link>
            </nav>
          </div>
        </header>

        <main className="container flex-1 py-8">{children}</main>

        <footer className="border-t py-6 bg-card/40">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">
                Multi Agent Med AI Platform · Collaborative Multi-Agent Oncology System
              </p>
              <p>
                B.Tech Final Year Capstone Project · Department of Computer Science &amp; Engineering
              </p>
            </div>
            <div className="text-right font-mono text-[11px]">
              <span>Dataset Sources: BraTS 2021 · LUNA16 · MSD Task07</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
