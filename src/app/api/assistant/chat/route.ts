import { z } from 'zod';
import { route, body, identifier } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { parentAssistant } from '@/server/integrations/parent-assistant';
export const POST = route(async (req) => {
  const identity = await requireIdentity(req, 'parent');
  const input = await body(
    req,
    z
      .object({
        message: z.string().trim().min(1).max(1500),
        previous: z.array(z.string().max(1500)).max(8),
        childId: identifier.optional(),
        visibilityKey: z.string().max(5000),
      })
      .strict(),
  );
  return parentAssistant(identity, input);
});
