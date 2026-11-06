import { route } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { dashboard } from '@/server/services/dashboard';
export const GET = route(async (req) =>
  dashboard(await requireIdentity(req), req.nextUrl.searchParams.get('childId') || undefined),
);
