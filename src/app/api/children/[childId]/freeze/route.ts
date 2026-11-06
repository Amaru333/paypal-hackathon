import { z } from 'zod';
import { route, body } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { freezeBudget } from '@/server/services/budgets';
export const PATCH = route(async (req, context) =>
  freezeBudget(
    await requireIdentity(req, 'parent'),
    (await context.params).childId,
    (await body(req, z.object({ frozen: z.boolean() }))).frozen,
  ),
);
