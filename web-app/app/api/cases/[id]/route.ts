import { NextResponse } from 'next/server';
import { getCase } from '@/lib/caseStore';
import { errorMessage } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const caseId = (params?.id ?? '').trim();
    if (!caseId || caseId.length > 128) {
      return NextResponse.json({ ok: false, error: 'Case ID missing or invalid' }, { status: 400 });
    }

    const data = await getCase(caseId);
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Case not found', caseId }, { status: 404 });
    }

    return NextResponse.json({ ok: true, case: data });
  } catch (err) {
    console.error('[api/cases/[id]] failure:', errorMessage(err));
    return NextResponse.json(
      { ok: false, error: 'Failed to retrieve case', detail: errorMessage(err) },
      { status: 500 },
    );
  }
}
