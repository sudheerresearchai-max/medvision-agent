import { NextResponse } from 'next/server';
import { getCase } from '@/lib/caseStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const caseId = params.id;
  if (!caseId) {
    return NextResponse.json({ ok: false, error: 'Case ID missing' }, { status: 400 });
  }

  const data = await getCase(caseId);
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Case not found', caseId }, { status: 404 });
  }

  return NextResponse.json({ ok: true, case: data });
}
