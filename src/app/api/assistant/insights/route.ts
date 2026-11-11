import { z } from 'zod';
import { route, body, identifier } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { readAssistantCard, readAssistantFamilyCard } from '@/server/services/assistant';
export const POST = route(async (req) => {
  const identity = await requireIdentity(req, 'parent');
  const input = await body(
    req,
    z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('family') }).strict(),
      z.object({ childId: identifier, kind: z.enum(['analysis', 'budget', 'requests']) }).strict(),
    ]),
  );
  return input.kind === 'family'
    ? readAssistantFamilyCard(identity)
    : readAssistantCard(identity, input.childId, input.kind);
});
