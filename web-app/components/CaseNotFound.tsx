'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AnalysisResult } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { cn } from '@/lib/utils';
import { CaseView } from '@/components/CaseView';

/**
 * Result-page fallback: server-side store missed the case id (expected on
 * ephemeral serverless without Supabase). Try the browser sessionStorage
 * mirror written by UploadForm before declaring the case lost.
 */
export function CaseNotFound({ caseId }: { caseId: string }) {
  const [hydrated, setHydrated] = React.useState<AnalysisResult | null | undefined>(undefined);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`medvision.case.${caseId}`);
      setHydrated(raw ? (JSON.parse(raw) as AnalysisResult) : null);
    } catch {
      setHydrated(null);
    }
  }, [caseId]);

  if (hydrated === undefined) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">Loading case…</div>
    );
  }

  if (hydrated) return <CaseView data={hydrated} />;

  return (
    <div className="space-y-6">
      <DisclaimerBanner />
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Case not found</CardTitle>
          <CardDescription>
            No stored analysis for <code>{caseId}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Without Supabase configured, this demo keeps cases only in function-instance
            memory plus your browser tab. The case likely expired or belongs to a
            different instance.
          </p>
          <Link href="/upload" className={cn(buttonVariants())}>
            Start a new analysis
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
