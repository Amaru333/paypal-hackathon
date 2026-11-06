import { route, appOrigin } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { completePayPal } from '@/server/services/payments';
import { NextResponse } from 'next/server';
export const GET = route(async (req) => {
  await completePayPal(
    await requireIdentity(req, 'parent'),
    req.nextUrl.searchParams.get('state') || '',
  );
  return NextResponse.redirect(new URL('/parent/family?payment=connected', appOrigin(req)));
});
