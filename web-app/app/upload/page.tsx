import type { Metadata } from 'next';
import { UploadForm } from '@/components/UploadForm';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Upload & Analyze · Multi-Model Medical Vision Analysis',
  description:
    'Submit a medical scan slice, clinical notes, and PDF reports for multi-model medical vision analysis using Agentic AI on tumors and medical.',
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1.5 border-b border-border/70 pb-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
            ✦ Anthropic Agentic Swarm
          </Badge>
          <span className="text-xs text-muted-foreground">5 Autonomous Clinical Specialists</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Multi model medical vision analysis using Agentic AI on tumors and medical
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Upload an axial brain MRI, thoracic chest CT, or abdominal scan. The multi-agent panel coordinates direct pixel inspection via Google Gemini Vision, parses clinical narratives, illuminates neoplastic margins, and derives RECIST 1.1 dimensions.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
