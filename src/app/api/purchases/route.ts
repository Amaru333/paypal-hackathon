import { z } from 'zod';
import { route, body, identifier } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { createPurchase } from '@/server/services/purchases';
export const POST = route(async (req) =>
  createPurchase(
    await requireIdentity(req, 'child'),
    await body(
      req,
      z.object({
        childId: identifier.optional(),
        key: z.string().min(1).max(64),
        productId: identifier,
      }),
    ),
  ),
);
