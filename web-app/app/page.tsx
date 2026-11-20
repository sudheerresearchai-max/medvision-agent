import { UploadForm } from '@/components/UploadForm';
import { Activity, ShieldCheck, Ruler, Users, Eye, Sparkles, Brain, Wind, Dna } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-10 py-2 sm:py-4">
      {/* Clinical Command Center Hero */}
      <section className="text-center space-y-3.5 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal Oncology Intelligence &middot; RECIST 1.1 Calibrated</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
          Autonomous Clinical Vision &amp; Tumor Diagnostic Console
        </h1>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          An investigational oncology decision-support engine. Upload cross-sectional MRI/CT imaging or describe clinical presentations to delineate lesion boundaries, measure RECIST calipers, and deliberate ranked differential diagnoses.
        </p>

        {/* Clinical Modality Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 font-mono text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border/70">
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            Neuro: Brain MRI (GBM / LGG)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border/70">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            Thoracic: Chest CT (NSCLC / Solitary Nodule)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border/70">
            <Dna className="w-3.5 h-3.5 text-purple-400" />
            Abdominal: Pancreas CT (PDAC)
          </span>
        </div>
      </section>

      {/* Primary Input Studio (Dropzone, Scenarios, Notes) */}
      <section>
        <UploadForm />
      </section>

      {/* Clinical Capabilities Architecture Grid */}
      <section className="pt-6 border-t border-border/60">
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Core Engine Capabilities
          </h2>
          <p className="text-sm font-semibold text-foreground">
            Engineered for High-Consequence Clinical Decision Support
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="workstation-card rounded-xl p-5 space-y-2.5 bg-card/60">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Ruler className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              RECIST 1.1 Morphological Calipers
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automated lesion boundary segmentation with pixel-calibrated longest diameter (LD), orthogonal short axis (SA), and volumetric burden estimation according to oncologic response standards.
            </p>
          </div>

          <div className="workstation-card rounded-xl p-5 space-y-2.5 bg-card/60">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              5-Specialist Multi-Agent Deliberation
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Coordinated consensus between Radiologist Vision Agent, Clinical NLP Agent, Biomarker Specialist, Scribe, and Safety Auditor to cross-validate findings and eliminate single-model hallucinations.
            </p>
          </div>

          <div className="workstation-card rounded-xl p-5 space-y-2.5 bg-card/60">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Negation-Aware Guardrails
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rigorous linguistic boundary filters differentiate between active disease and negative phrases (&quot;no focal consolidation&quot;, &quot;unremarkable parenchyma&quot;), preventing catastrophic false positives.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
