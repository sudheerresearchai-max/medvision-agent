import type { Metadata } from 'next';
import { getCase } from '@/lib/caseStore';
import { CaseView } from '@/components/CaseView';
import { CaseNotFound } from '@/components/CaseNotFound';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Case Result',
};

/**
 * Server component: resolve the case from Supabase or instance memory.
 * On a miss (ephemeral serverless without Supabase) the client fallback tries
 * the sessionStorage mirror written at analyze-time.
 */
export default async function CasePage({ params }: { params: { id: string } }) {
  const data = await getCase(params.id);
  if (!data) return <CaseNotFound caseId={params.id} />;
  return <CaseView data={data} />;
}
