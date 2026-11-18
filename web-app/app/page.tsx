import { UploadForm } from '@/components/UploadForm';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 py-4 sm:py-6">
      {/* Clean Compact Header */}
      <section className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-serif font-normal text-foreground tracking-tight">
          Medical vision &amp; tumor analysis
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Upload a cross-sectional scan or describe patient symptoms. An autonomous clinical panel examines imaging, delineates lesion margins, and formulates differential diagnoses.
        </p>
      </section>

      {/* Central Input Workspace */}
      <section>
        <UploadForm />
      </section>
    </div>
  );
}
