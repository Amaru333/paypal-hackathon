import { z } from 'zod';
import { route, body } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { purchaseAction } from '@/server/services/purchases';
export const POST = route(async (req, context) =>
  purchaseAction(
    await requireIdentity(req),
    (await context.params).purchaseId,
    (await body(req, z.object({ action: z.enum(['approve', 'decline', 'retry']) }))).action,
  ),
);
