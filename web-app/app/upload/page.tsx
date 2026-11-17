import type { Metadata } from 'next';
import { UploadForm } from '@/components/UploadForm';

export const metadata: Metadata = {
  title: 'Upload & Analyze · Multi-Model Medical Vision Analysis',
  description:
    'Submit a medical scan slice for multi model medical vision analysis using Agentic AI on tumors and medical.',
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="text-center space-y-2">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Multi model medical vision analysis using Agentic AI on tumors and medical
        </h1>
        <p className="text-xs font-mono text-muted-foreground">
          Autonomous multimodal agentic panel · Google Gemini Vision &amp; RECIST 1.1
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
