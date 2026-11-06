import { route, appOrigin } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { connectPayPal } from '@/server/services/payments';
export const POST = route(async (req) =>
  connectPayPal(await requireIdentity(req, 'parent'), appOrigin(req)),
);
