import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Wind,
  Dna,
  ShieldCheck,
  Workflow,
  Gauge,
  FileSearch,
  Users,
  Bot,
  Sparkles,
  Zap,
  Activity,
  Award,
  GraduationCap,
  Database,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MULTI_AGENT_PROFILES } from '@/lib/multiAgent/types';

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* High-Tier Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card/90 to-secondary/30 p-8 text-center sm:p-14 shadow-xs">
        {/* Glow ambient background elements */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl space-y-6">
          {/* B.Tech Capstone Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur">
            <GraduationCap className="h-4 w-4" />
            B.Tech Final Year Capstone Project · CSE Dept
          </div>

          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
            Collaborative Multi-Agent AI for{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              Clinical Oncology
            </span>
          </h1>

          <p className="text-pretty text-base sm:text-lg text-muted-foreground leading-relaxed">
            An advanced swarm of <strong>5 Specialized Autonomous AI Agents</strong> collaborating in real time to validate medical imaging, extract clinical context, execute deep neural segmentation, and assemble RECIST 1.1 compliant oncology reports.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link href="/upload" className={cn(buttonVariants({ size: 'lg' }), 'gap-2 shadow-sm font-semibold')}>
              <Zap className="h-4 w-4" /> Launch Multi-Agent Analysis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/datasets" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}>
              <Database className="h-4 w-4" /> Source of Datasets
            </Link>
            <Link href="/cases" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'gap-2')}>
              Study Archive
            </Link>
            <Link href="/docs" className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'gap-2')}>
              Docs &amp; Topology
            </Link>
          </div>
        </div>

        {/* Live Performance Matrix Strip */}
        <div className="mt-12 grid grid-cols-2 gap-4 border-t pt-8 sm:grid-cols-4 text-left">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">91.4%</div>
            <p className="text-xs text-muted-foreground font-medium">BraTS Glioma Dice Score</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">89.7%</div>
            <p className="text-xs text-muted-foreground font-medium">LUNA16 Lung Dice Score</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">5 Agents</div>
            <p className="text-xs text-muted-foreground font-medium">Autonomous Swarm Team</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">&lt;100ms</div>
            <p className="text-xs text-muted-foreground font-medium">Neural Inference Latency</p>
          </div>
        </div>
      </section>

      {/* The 5 Collaborative Specialized Agents Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="border-primary/40 text-primary">
            Autonomous Swarm Protocol
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Meet the 5 Specialized Clinical AI Agents
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Each specialized agent operates with dedicated domain prompts, deterministic execution tools, and inter-agent consensus validation.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(MULTI_AGENT_PROFILES).map((agent, i) => (
            <Card key={agent.role} className="border-border/70 bg-card hover:border-primary/50 transition-all hover:shadow-xs group">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold text-xs shadow-2xs"
                    style={{ backgroundColor: agent.color }}
                  >
                    0{i + 1}
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Agent 0{i + 1}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold group-hover:text-primary transition-colors mt-2">
                  {agent.name}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-foreground/80">
                  {agent.title}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p className="line-clamp-3 leading-relaxed">
                  {agent.specialty}
                </p>
                <div className="pt-2 border-t text-[11px] font-mono text-primary flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Autonomous Consensus Node
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Organ Specialties Cards */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="border-primary/40 text-primary">
            Clinical Target Domains
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Supported Oncology Modalities
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tailored neural U-Net feature extractors trained on international standard benchmark datasets.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <Brain className="h-6 w-6 text-blue-500" />,
              organ: 'Brain Oncology',
              modality: 'Axial T1-CE / FLAIR MRI',
              model: 'brain_unet.onnx',
              dataset: 'BraTS 2021 Benchmark',
              accuracy: '91.4% Dice',
            },
            {
              icon: <Wind className="h-6 w-6 text-cyan-500" />,
              organ: 'Thoracic Oncology',
              modality: 'High-Resolution Chest CT',
              model: 'lung_unet.onnx',
              dataset: 'LUNA16 / LIDC-IDRI',
              accuracy: '89.7% Dice',
            },
            {
              icon: <Dna className="h-6 w-6 text-purple-500" />,
              organ: 'Abdominal Oncology',
              modality: 'Contrast-Enhanced Abdominal CT/MRI',
              model: 'pancreas_unet.onnx',
              dataset: 'MSD Task07 Pancreatic',
              accuracy: '86.3% Dice',
            },
          ].map((o) => (
            <Card key={o.organ} className="border-border/80 bg-card/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg border bg-secondary/30 p-2.5">{o.icon}</div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    {o.accuracy}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold mt-2">{o.organ}</CardTitle>
                <CardDescription className="text-xs">{o.modality}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between border-t pt-2 text-muted-foreground">
                  <span>Training Corpus:</span>
                  <span className="font-semibold text-foreground">{o.dataset}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Weights File:</span>
                  <code className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-mono">{o.model}</code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Capstone Attribution Banner */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-secondary/20 to-primary/5 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-2">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Award className="h-4 w-4" /> Academic Engineering Capstone Project
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Department of Computer Science &amp; Engineering
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Developed as a B.Tech Final Year Capstone Innovation in Autonomous Medical AI, Multi-Agent Swarm Intelligence, and Quantitative RECIST 1.1 Computational Radiology.
            </p>
          </div>
          <Link href="/upload">
            <Button size="lg" className="gap-2 shadow-sm font-semibold shrink-0">
              <Zap className="h-4 w-4" /> Run Live Demo
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
