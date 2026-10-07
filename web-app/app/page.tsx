import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Wind,
  Dna,
  FileText,
  Upload,
  FolderOpen,
  BookOpen,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MULTI_AGENT_PROFILES } from '@/lib/multiAgent/types';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12">
      {/* Hero Section */}
      <section className="rounded-2xl border bg-card p-8 sm:p-12 text-center space-y-5 shadow-xs">
        <div className="mx-auto max-w-2xl space-y-3">
          <Badge variant="secondary" className="text-xs font-normal">
            Medical Imaging Analysis
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Medical Image Segmentation &amp; Reporting
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Automated organ segmentation and structured RECIST reporting for brain MRI, thoracic CT/X-Ray, and abdominal CT scans.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/upload" className={cn(buttonVariants({ size: 'default' }), 'gap-2')}>
            <Upload className="h-4 w-4" /> New Analysis <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/cases" className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'gap-2')}>
            <FolderOpen className="h-4 w-4" /> Case Archive
          </Link>
          <Link href="/docs" className={cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'gap-2')}>
            <BookOpen className="h-4 w-4" /> Documentation
          </Link>
        </div>
      </section>

      {/* Supported Modalities */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Supported Modalities &amp; Organs
          </h2>
          <p className="text-xs text-muted-foreground">
            Standard segmentation models configured for specific imaging modalities.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
              organ: 'Brain',
              modality: 'Axial T1 / FLAIR MRI',
              model: 'brain_unet.onnx',
              target: 'Intracranial tumor / lesion region',
              format: 'NIfTI, DICOM, PNG',
            },
            {
              icon: <Wind className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
              organ: 'Lung / Thorax',
              modality: 'Chest CT & X-Ray Radiographs',
              model: 'lung_unet.onnx',
              target: 'Pulmonary field & nodule segmentation',
              format: 'DICOM, NIfTI, PNG',
            },
            {
              icon: <Dna className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
              organ: 'Pancreas',
              modality: 'Contrast-Enhanced Abdominal CT',
              model: 'pancreas_unet.onnx',
              target: 'Pancreatic parenchymal boundary',
              format: 'NIfTI, DICOM, PNG',
            },
          ].map((item) => (
            <Card key={item.organ} className="border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md border bg-muted p-2">{item.icon}</div>
                  <div>
                    <CardTitle className="text-base font-semibold">{item.organ}</CardTitle>
                    <CardDescription className="text-xs">{item.modality}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground border-t pt-3">
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="font-medium text-foreground">{item.target}</span>
                </div>
                <div className="flex justify-between">
                  <span>Model:</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground">
                    {item.model}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span>Input:</span>
                  <span>{item.format}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pipeline Steps */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Analysis Pipeline
          </h2>
          <p className="text-xs text-muted-foreground">
            Structured workflow execution from initial scan ingestion to final summary.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          {[
            { step: '01', title: 'Input Validation', desc: 'Validates file format, resolution, and imaging metadata.' },
            { step: '02', title: 'Routing', desc: 'Identifies scan organ and modality for appropriate model selection.' },
            { step: '03', title: 'Segmentation', desc: 'Runs 2D U-Net inference to generate binary segmentation masks.' },
            { step: '04', title: 'Quantification', desc: 'Calculates lesion axes, surface area, and volume per RECIST 1.1.' },
            { step: '05', title: 'Reporting', desc: 'Generates structured clinical summary with findings and review log.' },
          ].map((s) => (
            <div key={s.step} className="rounded-lg border bg-card p-3.5 space-y-1.5 text-xs">
              <div className="font-mono text-[11px] font-semibold text-primary">{s.step}</div>
              <div className="font-medium text-foreground">{s.title}</div>
              <div className="text-muted-foreground text-[11px] leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Modules */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Processing Modules
          </h2>
          <p className="text-xs text-muted-foreground">
            Role-based agents coordinating validation, inference, and report compilation.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(MULTI_AGENT_PROFILES).map((agent, i) => (
            <Card key={agent.role} className="border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Module 0{i + 1}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-semibold mt-1.5">{agent.name}</CardTitle>
                <CardDescription className="text-xs">{agent.title}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <p className="leading-relaxed">{agent.specialty}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Standard Disclaimer Notice */}
      <section className="rounded-lg border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-foreground">Research Prototype Notice:</strong> This software is an experimental prototype designed for medical image processing research. It is not approved as a medical device and should not be used for primary clinical diagnosis or treatment planning.
        </p>
      </section>
    </div>
  );
}

