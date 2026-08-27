'use client';

import Link from 'next/link';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { ImageViewer } from '@/components/ImageViewer';
import { MaskOverlay } from '@/components/MaskOverlay';
import { PdfPreview } from '@/components/PdfPreview';
import { ReportPanel } from '@/components/ReportPanel';
import { AgentStatusPanel } from '@/components/AgentStatusPanel';
import { MultiAgentTrace } from '@/components/MultiAgentTrace';
import { cn } from '@/lib/utils';

/** Case result composition — everything the analysis produced, one screen. */
export function CaseView({ data }: { data: AnalysisResult }) {
  const preview = data.inputs.previewDataUrl ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Case <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">{data.caseId}</code>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Analyzed {new Date(data.createdAt).toLocaleString()} · storage:{' '}
            {data.storage === 'supabase' ? 'Supabase (durable)' : 'demo memory (ephemeral)'}
          </p>
        </div>
        <Link href="/upload" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden /> New analysis
        </Link>
      </div>

      {/* Routing summary strip */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-4 text-sm">
          <Stethoscope className="h-4 w-4 text-primary" aria-hidden />
          <Badge>{data.routing.modelKey ?? 'unrouted'}</Badge>
          <Badge variant="secondary">{data.routing.modality}</Badge>
          {data.manualOrganSelected && <Badge variant="outline">manual selection</Badge>}
          {data.inference?.engine === 'mock' && (
            <Badge variant="destructive">synthetic output</Badge>
          )}
          <span className="text-muted-foreground">{data.routing.reason}</span>
          {data.routing.assumptions.map((a) => (
            <span key={a} className="w-full text-xs text-amber-700 dark:text-amber-400">⚠ {a}</span>
          ))}
        </CardContent>
      </Card>

      {/* Safety warnings */}
      {data.safety.map((w, i) => (
        <div
          key={`${w.level}-${i}`}
          className={cn(
            'rounded-md border px-4 py-2.5 text-sm',
            w.level === 'critical'
              ? 'border-red-300 bg-red-50 font-medium text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
              : w.level === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
                : 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200',
          )}
        >
          {w.message}
        </div>
      ))}

      {/* Main grid */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <MaskOverlay
            originalSrc={preview}
            inference={data.inference}
            measurements={data.measurements}
          />
          <ImageViewer src={preview} alt="Original uploaded scan" caption={data.inputs.imageFileName} />
          <PdfPreview inputs={data.inputs} pdfText={undefined /* full text kept out of snapshot; see docs */} />
        </div>

        <div className="space-y-6">
          {/* Multi-Agent Collaborative Reasoning Graph */}
          {data.multiAgentTrace && <MultiAgentTrace trace={data.multiAgentTrace} />}

          <AgentStatusPanel steps={data.trace} />

          {/* Extracted clinical info JSON */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Extracted clinical info</CardTitle>
              <CardDescription>method: {data.clinical.extractionMethod}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border bg-secondary/40 p-3 font-mono text-xs leading-relaxed">
                {JSON.stringify(
                  {
                    organsMentioned: data.clinical.organsMentioned,
                    modalitiesMentioned: data.clinical.modalitiesMentioned,
                    symptoms: data.clinical.symptoms,
                    findings: data.clinical.findings,
                    laterality: data.clinical.laterality ?? null,
                    patientAgeYears: data.clinical.patientAgeYears ?? null,
                    patientSex: data.clinical.patientSex ?? null,
                    suspectedConditions: data.clinical.suspectedConditions,
                  },
                  null,
                  2,
                )}
              </pre>
            </CardContent>
          </Card>

          {/* Measurements detail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Measurements</CardTitle>
              <CardDescription>Pixel-space unless spacing metadata was available.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.measurements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No measurable region found.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.measurements.map((m) => (
                    <li key={m.label} className="flex justify-between gap-3 border-b pb-2 last:border-b-0">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-semibold tabular-nums">
                        {m.value.toLocaleString()} {m.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-width report */}
      <ReportPanel report={data.report} />
    </div>
  );
}
