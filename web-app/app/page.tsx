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
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
  FileCheck,
  Stethoscope,
  Scan,
  Ruler,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MULTI_AGENT_PROFILES, type AgentRole } from '@/lib/multiAgent/types';
import { ClinicalSafetyPrecautions } from '@/components/ClinicalSafetyPrecautions';

export default function HomePage() {
  const getAgentIcon = (role: AgentRole) => {
    switch (role) {
      case 'triage_agent':
        return <FileCheck className="h-4 w-4" />;
      case 'clinical_nlp_agent':
        return <Stethoscope className="h-4 w-4" />;
      case 'radiologist_vision_agent':
        return <Scan className="h-4 w-4" />;
      case 'biomarker_agent':
        return <Ruler className="h-4 w-4" />;
      case 'synthesis_scribe_agent':
        return <FileText className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      {/* Minimalist Hero Section */}
      <section className="rounded-2xl border border-border/80 bg-card p-8 sm:p-12 text-center space-y-6 shadow-xs">
        <div className="mx-auto max-w-3xl space-y-3.5">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1">
            ✦ Anthropic-Style Agentic Intelligence · Multimodal Oncology
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-foreground leading-tight">
            Multi model medical vision analysis using Agentic AI on tumors and medical
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Autonomous multi-agent clinical consensus engine orchestrating Google Gemini Multimodal Vision AI,
            deep convolutional neural networks, and RECIST 1.1 biomarker morphometry to detect, illuminate, and stage neoplastic lesions.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/upload"
            className={cn(buttonVariants({ size: 'default' }), 'gap-2 font-semibold shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground')}
          >
            <Upload className="h-4 w-4" /> Start Scan Analysis <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/cases" className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'gap-2 border-border/80')}>
            <FolderOpen className="h-4 w-4" /> Case Archive
          </Link>
          <Link href="/docs" className={cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'gap-2')}>
            <BookOpen className="h-4 w-4" /> Clinical Protocols
          </Link>
        </div>
      </section>

      {/* Mandatory Clinical Operating Instructions & Safety Precautions */}
      <ClinicalSafetyPrecautions />

      {/* Autonomous Clinical Specialist Panel (NOT Simple Bots) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Specialized Multi-Agent Clinical Panel
            </h2>
            <p className="text-xs text-muted-foreground">
              Autonomous clinical intelligence panel where each agent owns a specific medical discipline (NOT simple generic bots).
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
            5 Autonomous Agents Active
          </Badge>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(MULTI_AGENT_PROFILES).map((agent, i) => (
            <Card key={agent.role} className="border border-border/80 bg-card hover:border-primary/40 transition-all shadow-xs">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {getAgentIcon(agent.role)}
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-mono">
                    Specialist 0{i + 1}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2 text-foreground">{agent.name}</CardTitle>
                <CardDescription className="text-xs text-primary font-medium">{agent.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-2.5">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Domain Specialty
                  </span>
                  <p className="text-foreground text-[11px] leading-snug">{agent.specialty}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    System Mandate
                  </span>
                  <p className="line-clamp-2 text-[10px] text-muted-foreground font-mono bg-secondary/30 p-1.5 rounded border border-border/60">
                    {agent.systemPrompt}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Supported Modalities */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Target Organs &amp; Modality Support
          </h2>
          <p className="text-xs text-muted-foreground">
            Calibrated for axial brain MRI, thoracic chest CT, and abdominal pancreatic imaging.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <Brain className="h-5 w-5 text-primary" />,
              organ: 'Brain',
              modality: 'Axial T1-CE / FLAIR MRI',
              model: 'Google Gemini Vision + U-Net',
              target: 'Intracranial neoplasm / Glioblastoma',
              format: 'NIfTI, DICOM, PNG, JPEG',
            },
            {
              icon: <Wind className="h-5 w-5 text-primary" />,
              organ: 'Lung / Thorax',
              modality: 'Axial Chest CT & Radiography',
              model: 'Google Gemini Vision + U-Net',
              target: 'Spiculated pulmonary nodule / NSCLC',
              format: 'DICOM, NIfTI, PNG, JPEG',
            },
            {
              icon: <Dna className="h-5 w-5 text-primary" />,
              organ: 'Pancreas',
              modality: 'Contrast-Enhanced Abdominal CT',
              model: 'Google Gemini Vision + U-Net',
              target: 'Pancreatic ductal adenocarcinoma (PDAC)',
              format: 'NIfTI, DICOM, PNG, JPEG',
            },
          ].map((item) => (
            <Card key={item.organ} className="border border-border/80 bg-card shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">{item.icon}</div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">{item.organ}</CardTitle>
                    <CardDescription className="text-xs">{item.modality}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-semibold text-foreground truncate max-w-[170px]">{item.target}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Inference:</span>
                  <span className="font-mono text-[10px] text-primary">{item.model}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Formats:</span>
                  <span>{item.format}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Regulatory Research Disclaimer Notice */}
      <section className="rounded-xl border border-border/70 bg-secondary/20 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-foreground">Research Prototype Notice:</strong> MedVision is an investigational AI decision support platform developed for multi-modal oncology research. It is not an FDA-cleared or CE-marked medical device and should not be used as the sole basis for clinical diagnosis, radiation oncology targeting, or surgical decisions. All segmentations require board-certified physician sign-off.
        </p>
      </section>
    </div>
  );
}
