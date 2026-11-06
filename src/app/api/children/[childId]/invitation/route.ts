import { route, appOrigin } from '@/server/http/route';
import { requireIdentity } from '@/server/auth/session';
import { renewInvitation, revokeInvitation } from '@/server/services/children';
export const POST = route(async (req, context) =>
  renewInvitation(
    await requireIdentity(req, 'parent'),
    (await context.params).childId,
    appOrigin(req),
  ),
);
export const DELETE = route(async (req, context) =>
  revokeInvitation(await requireIdentity(req, 'parent'), (await context.params).childId),
);
