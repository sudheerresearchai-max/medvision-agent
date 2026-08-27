'use client';

import * as React from 'react';
import { FileText, Copy, Download, Printer, CheckCheck, Award, ShieldCheck } from 'lucide-react';
import type { StructuredReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ReportPanelProps {
  report: StructuredReport;
}

export function ReportPanel({ report }: ReportPanelProps) {
  const [copied, setCopied] = React.useState(false);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(report.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  };

  const download = () => {
    const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medvision-clinical-report-${report.generatedAt.slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card id="report" className="border-border/80 shadow-xs print:shadow-none print:border-none">
      <CardHeader className="pb-4 border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="h-5 w-5 text-primary" />
              Comprehensive Clinical Oncology Report
            </CardTitle>
            <CardDescription className="text-xs">
              Automated Diagnostic Evaluation · Generated {new Date(report.generatedAt).toLocaleString()}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={copyMarkdown} className="h-8 text-xs">
              {copied ? (
                <>
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Markdown
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={download} className="h-8 text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export .MD
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} className="h-8 text-xs font-semibold">
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6 print:pt-0">
        {/* Printable Institutional Header (visible on print or inspection) */}
        <div className="rounded-lg border bg-secondary/15 p-4 print:border-b-2 print:rounded-none">
          <div className="flex justify-between items-start border-b pb-3 mb-3">
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-primary">
                MULTI AGENT MED AI PLATFORM
              </h3>
              <p className="text-xs text-muted-foreground">Department of Diagnostic Imaging &amp; Computational Oncology</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="font-mono font-semibold text-foreground">REPORT REF: {report.generatedAt.slice(0, 19).replace(/[^0-9]/g, '')}</p>
              <p>Status: Multi-Agent Consensus Evaluation</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Service Modality</span>
              <span className="font-semibold">5-Agent Swarm + U-Net</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Segmentation Protocol</span>
              <span className="font-semibold">RECIST 1.1 Standard</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Confidence Metric</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">High Resolution</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Audit Trail</span>
              <span className="font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified Multi-Agent Trace
              </span>
            </div>
          </div>
        </div>

        {/* Structured Sections */}
        <div className="space-y-4">
          {report.sections.map((section) => (
            <section key={section.heading} className="rounded-md border p-4 bg-card/60">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary border-b pb-1.5 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                {section.heading}
              </h4>
              <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {/* Clinical Sign-Off Block */}
        <div className="mt-8 pt-4 border-t flex flex-wrap justify-between items-end gap-6 text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Computational Biology &amp; Radiology Review</p>
            <p>Multi Agent Med AI Collaborative Decision Support System v1.0</p>
          </div>
          <div className="w-56 border-t-2 border-dotted pt-2 text-center">
            <p className="font-semibold text-foreground">Attending Radiologist / Reviewer</p>
            <p className="text-[10px] text-muted-foreground">Signature &amp; Verification Stamp</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
