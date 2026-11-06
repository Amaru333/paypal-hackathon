import { z } from 'zod';
import { route, body, appOrigin } from '@/server/http/route';
import { sessionResponse } from '@/server/auth/session';
import { login } from '@/server/services/auth';
export const POST = route(async (req) =>
  sessionResponse(
    await login(
      await body(
        req,
        z.object({
          role: z.enum(['parent', 'child']),
          email: z.string().max(254).optional(),
          username: z.string().max(24).optional(),
          password: z.string().min(1).max(128),
        }),
      ),
    ),
    appOrigin(req),
  ),
);
