import { z } from 'zod';
import { route, body } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { updateBudget } from '@/server/services/budgets';
export const PUT = route(async (req, context) =>
  updateBudget(
    await requireIdentity(req, 'parent'),
    (await context.params).childId,
    (await body(req, z.object({ policy: z.unknown() }))).policy,
  ),
);
