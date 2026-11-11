import { z } from 'zod';
import { route, body } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { setBirthDate } from '@/server/services/children';
export const PATCH = route(async (req, context) =>
  setBirthDate(
    await requireIdentity(req, 'parent'),
    (await context.params).childId,
    (await body(req, z.object({ birthDate: z.string() }).strict())).birthDate,
  ),
);
