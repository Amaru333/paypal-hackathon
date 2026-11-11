import { z } from 'zod';
import { route, body } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { setPrivacy } from '@/server/services/children';
export const PATCH = route(async (req, context) =>
  setPrivacy(
    await requireIdentity(req, 'child'),
    (await context.params).childId,
    (await body(req, z.object({ enabled: z.boolean() }).strict())).enabled,
  ),
);
