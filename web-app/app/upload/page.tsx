import type { Metadata } from 'next';
import { UploadForm } from '@/components/UploadForm';

export const metadata: Metadata = {
  title: 'Upload & Analyze',
  description:
    'Submit a medical scan, clinical text, and a report PDF to the MedVision Agent research pipeline.',
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The agent validates each input, extracts text, routes to the right model, and
          produces a structured research report. Typical end-to-end time: 5–30 s.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
