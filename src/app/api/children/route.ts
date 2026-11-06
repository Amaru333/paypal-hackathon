import { z } from 'zod';
import { route, body, appOrigin } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { addChild } from '@/server/services/children';
export const POST = route(async (req) => {
  const identity = await requireIdentity(req, 'parent');
  const input = await body(req, z.object({ name: z.string().trim().min(1).max(40) }));
  return addChild(identity, input.name, appOrigin(req));
});
