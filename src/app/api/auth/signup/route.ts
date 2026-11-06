import { z } from 'zod';
import { route, body, appOrigin } from '@/server/http/route';
import { sessionResponse } from '@/server/auth/session';
import { signup } from '@/server/services/auth';
export const POST = route(async (req) =>
  sessionResponse(
    await signup(
      await body(
        req,
        z.object({
          name: z.string().trim().min(1).max(40),
          email: z.email().max(254),
          password: z.string().min(10).max(128),
        }),
      ),
    ),
    appOrigin(req),
  ),
);
