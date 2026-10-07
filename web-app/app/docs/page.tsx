'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Boxes,
  Database,
  Route,
  Server,
  Award,
  Cpu,
  Zap,
  Activity,
  Layers,
  Sparkles,
  BookCheck,
  ExternalLink,
  Brain,
  Wind,
  Dna,
  ArrowDown,
  ShieldCheck,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AGENT_PIPELINE } from '@/lib/types';

export default function DocsPage() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'datasets' | 'topology' | 'tools'>('overview');

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          System Documentation
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Technical specifications for model architectures, reference training datasets, system architecture, and processing pipeline modules.
        </p>

        {/* Quick Navigation Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="text-xs h-8"
          >
            <Boxes className="mr-1.5 h-3.5 w-3.5" /> Models &amp; Architecture
          </Button>
          <Button
            variant={activeTab === 'datasets' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('datasets')}
            className="text-xs h-8"
          >
            <Database className="mr-1.5 h-3.5 w-3.5" /> Reference Datasets
          </Button>
          <Button
            variant={activeTab === 'topology' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('topology')}
            className="text-xs h-8"
          >
            <Layers className="mr-1.5 h-3.5 w-3.5" /> System Topology
          </Button>
          <Button
            variant={activeTab === 'tools' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('tools')}
            className="text-xs h-8"
          >
            <Route className="mr-1.5 h-3.5 w-3.5" /> Pipeline Modules
          </Button>
        </div>
      </header>

      {/* SECTION 1: Source of Datasets (Direct Navigation) */}
      {(activeTab === 'overview' || activeTab === 'datasets') && (
        <section id="datasets" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Database className="h-5 w-5 text-primary" /> Reference Datasets
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Public datasets used for training and testing the segmentation models.
              </p>
            </div>
            <Link href="/datasets">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                Dataset Explorer <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            {/* LGG MRI Card */}
            <Card className="border bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                    <Brain className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    3,929 Slice Pairs
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold mt-2">TCGA-LGG (Brain MRI)</CardTitle>
                <CardDescription className="text-xs">
                  Lower-Grade Glioma Segmentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  2D FLAIR MRI slices and consensus binary tumor masks from 110 patients.
                </p>
                <div className="pt-2 border-t">
                  <a
                    href="https://www.kaggle.com/datasets/mateuszbuda/lgg-mri-segmentation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-block"
                  >
                    <Button size="sm" variant="outline" className="w-full gap-1 text-xs">
                      Kaggle Dataset <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Chest X-Ray / CT Card */}
            <Card className="border bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-500">
                    <Wind className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    800+ Scans
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold mt-2">Chest X-Ray &amp; CT Lungs</CardTitle>
                <CardDescription className="text-xs">
                  Thoracic Lung Field Segmentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  Chest radiographs and thoracic CT slices paired with ground truth lung masks.
                </p>
                <div className="pt-2 border-t">
                  <a
                    href="https://www.kaggle.com/datasets/nikhilpandey360/chest-xray-masks-and-labels"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-block"
                  >
                    <Button size="sm" variant="outline" className="w-full gap-1 text-xs">
                      Kaggle Dataset <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* MSD Task07 Pancreas Card */}
            <Card className="border bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
                    <Dna className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    420 CT Volumes
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold mt-2">MSD Task07 (Pancreas)</CardTitle>
                <CardDescription className="text-xs">
                  Medical Segmentation Decathlon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  Portal venous phase abdominal CT scans with annotated pancreatic parenchyma.
                </p>
                <div className="pt-2 border-t">
                  <a
                    href="http://medicaldecathlon.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-block"
                  >
                    <Button size="sm" variant="outline" className="w-full gap-1 text-xs">
                      MSD Portal <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* SECTION 2: Model Specifications Table */}
      {(activeTab === 'overview' || activeTab === 'datasets') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Boxes className="h-5 w-5 text-primary" /> Model Architecture Specifications
            </h2>
            <Badge variant="outline" className="text-xs">
              ONNX Runtime 2D
            </Badge>
          </div>
          <Card className="overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/50 font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3">Target Organ</th>
                    <th className="p-3">Reference Dataset</th>
                    <th className="p-3">Architecture</th>
                    <th className="p-3 text-center">Input Size</th>
                    <th className="p-3 text-center">Channels</th>
                    <th className="p-3 text-right">Model Weights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> Brain (Glioma)
                    </td>
                    <td className="p-3 text-muted-foreground">TCGA-LGG MRI</td>
                    <td className="p-3 font-mono">2D MiniUNet</td>
                    <td className="p-3 text-center font-mono">256×256</td>
                    <td className="p-3 text-center font-mono">3 (RGB)</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">brain_unet.onnx</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-500" /> Lung (Thorax)
                    </td>
                    <td className="p-3 text-muted-foreground">Chest X-Ray / CT Lungs</td>
                    <td className="p-3 font-mono">2D MiniUNet</td>
                    <td className="p-3 text-center font-mono">256×256</td>
                    <td className="p-3 text-center font-mono">1 (Grayscale)</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">lung_unet.onnx</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-500" /> Pancreas (PDAC)
                    </td>
                    <td className="p-3 text-muted-foreground">MSD Task07 CT</td>
                    <td className="p-3 font-mono">2D MiniUNet</td>
                    <td className="p-3 text-center font-mono">256×256</td>
                    <td className="p-3 text-center font-mono">1 (HU Grayscale)</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">pancreas_unet.onnx</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* SECTION 3: High-Tier Visual Multi-Tier System Topology */}
      {(activeTab === 'overview' || activeTab === 'topology') && (
        <section id="topology" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Boxes className="h-5 w-5 text-primary" /> Multi-Tier System Topology
            </h2>
            <Badge className="bg-primary/10 text-primary border-primary/30">
              Distributed Cloud Architecture
            </Badge>
          </div>

          <div className="space-y-3 rounded-2xl border bg-gradient-to-b from-card via-card/80 to-secondary/20 p-5 sm:p-7 shadow-xs">
            {/* Tier 1: Presentation Workspace */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-700 dark:text-blue-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[11px]">1</span>
                  Tier 1: Next.js 14 Clinical Diagnostic Workspace
                </div>
                <Badge variant="outline" className="border-blue-500/40 text-blue-600 text-[10px]">Client / Edge UI</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground pt-1">
                <div className="rounded-md border bg-background/80 p-2">
                  <strong className="text-foreground block">1-Click Interactive Showcase</strong>
                  Preloaded BraTS, LUNA16 &amp; MSD clinical cases.
                </div>
                <div className="rounded-md border bg-background/80 p-2">
                  <strong className="text-foreground block">PACS Split-Screen Viewer</strong>
                  Window/Level contrast presets &amp; live slider.
                </div>
                <div className="rounded-md border bg-background/80 p-2">
                  <strong className="text-foreground block">RECIST 1.1 Report Generator</strong>
                  Automated clinical oncology report print engine.
                </div>
              </div>
            </div>

            {/* Connector 1 -> 2 */}
            <div className="flex justify-center my-1">
              <div className="flex items-center gap-1.5 rounded-full border bg-secondary/80 px-3 py-1 text-[11px] font-mono text-muted-foreground">
                <ArrowDown className="h-3 w-3 text-primary animate-bounce" />
                Multipart Form-Data Stream &amp; REST Route Handler (/api/analyze)
              </div>
            </div>

            {/* Tier 2: Multi-Agent Orchestrator */}
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-primary">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px]">2</span>
                  Tier 2: Multi-Agent Processing Pipeline
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[10px]">5 Modular Agents</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-5 text-[11px] pt-1">
                <div className="rounded-md border bg-background p-2 text-center">
                  <span className="font-bold text-blue-600 block">Dr. Triage AI</span>
                  <span className="text-muted-foreground text-[10px]">Format Sniffing</span>
                </div>
                <div className="rounded-md border bg-background p-2 text-center">
                  <span className="font-bold text-purple-600 block">Dr. Lexicon AI</span>
                  <span className="text-muted-foreground text-[10px]">Clinical NLP</span>
                </div>
                <div className="rounded-md border bg-background p-2 text-center">
                  <span className="font-bold text-cyan-600 block">Dr. Vision AI</span>
                  <span className="text-muted-foreground text-[10px]">U-Net Dispatch</span>
                </div>
                <div className="rounded-md border bg-background p-2 text-center">
                  <span className="font-bold text-emerald-600 block">Dr. Metric AI</span>
                  <span className="text-muted-foreground text-[10px]">RECIST 1.1</span>
                </div>
                <div className="rounded-md border bg-background p-2 text-center">
                  <span className="font-bold text-amber-600 block">Chief Scribe AI</span>
                  <span className="text-muted-foreground text-[10px]">Consensus QA</span>
                </div>
              </div>
            </div>

            {/* Connector 2 -> 3 */}
            <div className="flex justify-center my-1">
              <div className="flex items-center gap-1.5 rounded-full border bg-secondary/80 px-3 py-1 text-[11px] font-mono text-muted-foreground">
                <ArrowDown className="h-3 w-3 text-primary animate-bounce" />
                ONNX Tensor Execution &amp; PostgreSQL RPC Handlers
              </div>
            </div>

            {/* Tier 3: Inference Core & PACS Database */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[11px]">3A</span>
                    Inference Execution Core
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[10px]">FastAPI / ONNX</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Neural engine executing forward passes for <code className="text-foreground font-mono">brain_unet</code>, <code className="text-foreground font-mono">lung_unet</code>, and <code className="text-foreground font-mono">pancreas_unet</code>.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-indigo-700 dark:text-indigo-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white text-[11px]">3B</span>
                    Supabase PACS Database
                  </div>
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-600 text-[10px]">PostgreSQL Storage</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Persistent study archive storing patient cases, segmentation masks, RECIST 1.1 metrics, and audit logs.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: RECIST 1.1 Mathematical Formulation */}
      {(activeTab === 'overview' || activeTab === 'tools') && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Activity className="h-5 w-5 text-primary" /> RECIST 1.1 &amp; Morphometry Formulation
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">RECIST 1.1 Longest Diameter</CardTitle>
                <CardDescription className="text-xs">Response Evaluation Criteria In Solid Tumors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">
                  Calculates the maximal Euclidean distance between any two lesion boundary contour points p1, p2:
                </p>
                <pre className="rounded bg-secondary/50 p-2 font-mono text-[11px]">
                  d_max = max || p_1 - p_2 ||_2  (mm = px * spacing)
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Estimated Tumor Volume (Ellipsoid Model)</CardTitle>
                <CardDescription className="text-xs">Modified Prolate Spheroid Model</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">
                  Approximates 3-D lesion burden volume from orthogonal cross-sectional axes:
                </p>
                <pre className="rounded bg-secondary/50 p-2 font-mono text-[11px]">
                  V_tumor = (4/3) * pi * (d_longest / 2) * (d_short / 2)^2
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* SECTION 5: The 13 Agentic Decision Tools */}
      {(activeTab === 'overview' || activeTab === 'tools') && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Route className="h-5 w-5 text-primary" /> The 13 Agentic Execution Tools
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {AGENT_PIPELINE.map((tool, i) => (
              <div key={tool.name} className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-bold">{tool.label}</p>
                  <code className="text-[11px] text-muted-foreground">{tool.name}()</code>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Navigation CTA */}
      <div className="pt-6 border-t flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm">Ready to evaluate a study?</h3>
          <p className="text-xs text-muted-foreground">Test the multi-agent system on verified clinical scans.</p>
        </div>
        <Link href="/upload">
          <Button className="gap-2">
            <Zap className="h-4 w-4" /> Launch Multi-Agent Evaluator
          </Button>
        </Link>
      </div>
    </div>
  );
}
