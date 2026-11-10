import { z } from 'zod';
import { route, body } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { changeVault } from '@/server/services/vault';

export const POST = route(async (req, context) =>
  changeVault(
    await requireIdentity(req, 'parent'),
    (await context.params).childId,
    await body(
      req,
      z.union([
        z.object({ enabled: z.boolean() }).strict(),
        z.object({ cents: z.number().int().positive().max(2147483647) }).strict(),
      ]),
    ),
  ),
);
