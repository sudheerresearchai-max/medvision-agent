import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MedVision · Multimodal Clinical Vision & Oncology AI',
    template: '%s · MedVision',
  },
  description:
    'Multimodal clinical vision analysis on tumors and medical scans. Investigational decision support powered by Google Gemini Vision and autonomous specialist agents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {/* Claude Minimalist Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-85">
              <span className="text-primary text-xl select-none font-serif leading-none">✳</span>
              <span className="text-base font-semibold tracking-tight text-foreground font-serif">
                MedVision
              </span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2 text-xs font-mono text-muted-foreground">
              <Link
                href="/"
                className="rounded-lg px-2.5 py-1.5 transition-colors hover:text-foreground hover:bg-secondary/60"
              >
                New analysis
              </Link>
              <Link
                href="/cases"
                className="rounded-lg px-2.5 py-1.5 transition-colors hover:text-foreground hover:bg-secondary/60"
              >
                Archive
              </Link>
              <Link
                href="/docs"
                className="rounded-lg px-2.5 py-1.5 transition-colors hover:text-foreground hover:bg-secondary/60 hidden sm:inline-flex"
              >
                Docs
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6">{children}</main>

        {/* Claude Quiet Footer */}
        <footer className="border-t border-border/60 py-6 text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-4xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 font-mono text-[11px]">
            <p>
              MedVision · Multimodal Medical AI Decision Support
            </p>
            <div className="flex items-center gap-3">
              <span>Gemini Vision</span>
              <span>·</span>
              <span>RECIST 1.1</span>
              <span>·</span>
              <span>Investigational use only</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
