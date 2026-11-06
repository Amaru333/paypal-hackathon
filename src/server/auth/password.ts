import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}
export function verifyPassword(password: string, saved: string) {
  const [salt, digest] = saved.split(':');
  if (!salt || !digest) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(digest, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
export function digestToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
