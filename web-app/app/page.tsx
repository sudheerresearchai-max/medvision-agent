import { UploadForm } from '@/components/UploadForm';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-10 sm:py-16">
      {/* Claude Style Welcome */}
      <section className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary/80 text-primary text-xl font-serif select-none mb-1">
          ✳
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-normal text-foreground tracking-tight">
          Medical vision &amp; tumor analysis
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Upload a cross-sectional scan or describe patient symptoms. An autonomous clinical panel examines imaging, delineates lesion margins, and formulates differential diagnoses.
        </p>
      </section>

      {/* Claude Style Central Workspace */}
      <section>
        <UploadForm />
      </section>
    </div>
  );
}
