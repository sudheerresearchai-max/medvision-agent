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
    // 1. Try browser sessionStorage first (fastest)
    try {
      const raw = sessionStorage.getItem(`medvision.case.${caseId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as AnalysisResult;
        if (parsed?.caseId) {
          setHydrated(parsed);
          return;
        }
      }
    } catch {
      // ignore quota or parse error
    }

    // 2. Fallback: query API in case serverless cold-start missed during SSR
    fetch(`/api/cases/${caseId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.case) {
          setHydrated(data.case as AnalysisResult);
        } else {
          setHydrated(null);
        }
      })
      .catch(() => {
        setHydrated(null);
      });
  }, [caseId]);

  if (hydrated === undefined) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground animate-pulse">
        Loading case data…
      </div>
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
            No stored analysis record for <code>{caseId}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            The requested case study could not be located in persistent storage or local session cache.
            It may have expired, or belongs to a different environment.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Link href="/upload" className={cn(buttonVariants({ size: 'sm' }))}>
              Start a new analysis
            </Link>
            <Link href="/cases" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              Browse Case Archive
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
