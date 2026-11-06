import { route } from '@/server/http/route';
import { getIdentity, cookieName } from '@/server/auth/session';
export const GET = route(async (req) => ({
  identity: await getIdentity(req.cookies.get(cookieName)?.value),
}));
