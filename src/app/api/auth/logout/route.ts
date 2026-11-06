import { route } from '@/server/http/route';
import { cookieName } from '@/server/auth/session';
import { database } from '@/server/db/client';
import { digestToken } from '@/server/auth/password';
import { NextResponse } from 'next/server';
export const POST = route(async (req) => {
  await database().session.deleteMany({
    where: { tokenHash: digestToken(req.cookies.get(cookieName)?.value || '') },
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(cookieName);
  return response;
});
