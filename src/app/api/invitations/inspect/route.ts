import { z } from 'zod';
import { route, body } from '@/server/http/route';

import { findInvitation } from '@/server/services/children';
export const POST = route(async (req) => {
  const { token } = await body(
    req,
    z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid invitation.') }),
  );
  const invite = await findInvitation(token);
  return {
    name: invite.child.name,
    parentName: invite.child.parent.name,
    expiresAt: invite.expiresAt.getTime(),
  };
});
