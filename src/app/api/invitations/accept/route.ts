import { z } from 'zod';
import { route, body, appOrigin, HttpError } from '@/server/http/route';
import { getIdentity, sessionResponse, cookieName } from '@/server/auth/session';
import { acceptInvitation } from '@/server/services/children';
export const POST = route(async (req) => {
  const current = await getIdentity(req.cookies.get(cookieName)?.value);
  if (current?.role === 'parent')
    throw new HttpError(
      'Open this invitation in a private window so your child can create their account.',
    );
  const input = await body(
    req,
    z.object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      username: z
        .string()
        .regex(
          /^[a-zA-Z0-9_]{3,24}$/,
          'Choose a username with 3–24 letters, numbers, or underscores.',
        ),
      password: z.string().min(10).max(128),
    }),
  );
  return sessionResponse(
    await acceptInvitation(input.token, input.username, input.password),
    appOrigin(req),
  );
});
