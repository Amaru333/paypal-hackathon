import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { HttpError } from './errors';

export { HttpError };
export const identifier = z.string().trim().min(1).max(128);
export function appOrigin(req: NextRequest) {
  const configured = process.env.APP_URL;
  const origin = configured
    ? new URL(configured).origin
    : new URL(`http://${req.headers.get('host')}`).origin;
  if (!configured && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname))
    throw new HttpError('Configure APP_URL for this host.', 403);
  if (req.headers.get('host') !== new URL(origin).host)
    throw new HttpError('Invalid application host.', 403);
  return origin;
}
export async function body<T>(req: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const raw = await req.text();
  if (raw.length > 10000) throw new HttpError('Request is too large.', 413);
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) throw new HttpError('Invalid JSON.');
    throw error;
  }
}
type Context = { params: Promise<Record<string, string>> };
export function route(handler: (req: NextRequest, context: Context) => Promise<unknown>) {
  return async (req: NextRequest, context: Context) => {
    try {
      const origin = appOrigin(req);
      if (!['GET', 'HEAD'].includes(req.method) && req.headers.get('origin') !== origin)
        throw new HttpError('Please submit this action from the app.', 403);
      const result = await handler(req, context);
      const response = result instanceof Response ? result : NextResponse.json(result);
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('Referrer-Policy', 'same-origin');
      return response;
    } catch (error) {
      let message =
        'The request could not be completed. Check the server configuration and try again.';
      let status = 500;
      if (error instanceof HttpError) {
        message = error.message;
        status = error.status;
      } else if (error instanceof ZodError) {
        message = error.issues[0]?.message || 'Invalid input.';
        status = 400;
      } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        message = 'That email, username, or request already exists.';
        status = 409;
      } else if (!process.env.DATABASE_URL) {
        message = 'Configure DATABASE_URL and run database migrations.';
        status = 503;
      }
      // Do not expose SQL, connection strings, payment tokens, or stack traces to the browser.
      return NextResponse.json(
        { error: message },
        { status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}
