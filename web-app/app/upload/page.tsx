import type { Metadata } from 'next';
import { UploadForm } from '@/components/UploadForm';
import { Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Diagnostic Studio · MedVision',
  description:
    'Multimodal clinical vision analysis, RECIST 1.1 lesion measurement, and autonomous multi-agent oncology differential consensus.',
};

export default function UploadPage() {
  return (
    <div className="space-y-6 py-2">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Clinical Diagnostic Studio
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Autonomous multimodal oncology panel &middot; Powered by Google Gemini Vision and RECIST 1.1 calibrated morphometry.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
