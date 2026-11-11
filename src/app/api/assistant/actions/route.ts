import { z } from 'zod';
import { route, body, identifier } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { decideAssistantAction } from '@/server/services/assistant';
export const POST = route(async (req) => {
  const identity = await requireIdentity(req, 'parent');
  const input = await body(
    req,
    z.object({ id: identifier, decision: z.enum(['confirm', 'cancel']) }).strict(),
  );
  return decideAssistantAction(identity, input.id, input.decision);
});
