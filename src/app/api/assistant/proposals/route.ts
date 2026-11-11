import { route, body } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { assistantCommand } from '@/domain/assistant';
import { proposeAssistantAction } from '@/server/services/assistant';
export const POST = route(async (req) =>
  proposeAssistantAction(await requireIdentity(req, 'parent'), await body(req, assistantCommand)),
);
