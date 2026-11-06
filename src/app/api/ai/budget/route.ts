import { z } from 'zod';
import { route, body, identifier } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { readPolicy } from '@/server/services/budgets';
import { draftPolicy } from '@/server/integrations/openai';
export const POST = route(async (req) => {
  const identity = await requireIdentity(req, 'parent');
  const input = await body(
    req,
    z.object({ childId: identifier, prompt: z.string().trim().min(1).max(1000) }),
  );
  return { policy: await draftPolicy(input.prompt, await readPolicy(identity, input.childId)) };
});
