import type { Metadata } from 'next';
import Link from 'next/link';
import { Brain, Database, BookOpen, Home, Layers } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MedVision — Medical Image Analysis',
    template: '%s · MedVision',
  },
  description:
    'Medical imaging segmentation and structured clinical reporting for brain, thoracic, and abdominal scans.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans">
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Brain className="h-5 w-5 text-primary" aria-hidden />
              <span>MedVision</span>
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
                Case Archive
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

        <footer className="border-t py-6 text-xs text-muted-foreground">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">
                MedVision · Medical Image Segmentation &amp; Reporting
              </p>
              <p className="text-[11px] text-muted-foreground">
                Open research prototype · Not approved for primary diagnostic use
              </p>
            </div>
            <div className="text-right text-[11px]">
              <span>Research &amp; evaluation platform</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
