import { createHash } from 'node:crypto';

type InvitationEmail = { to: string; name: string; url: string };

export function invitationEmailText({ name, url }: InvitationEmail) {
  return `Hi ${name},\n\nYour parent has invited you to Pocket! Choose your own username and password to get started:\n\n${url}\n\nThis private link expires in 24 hours and can only be used once. If you weren’t expecting this invitation, you can ignore this email.\n\nThe Pocket team`;
}

export async function sendInvitationEmail(
  input: InvitationEmail,
): Promise<'sent' | 'failed' | 'not_configured'> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return 'not_configured';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `invitation-${createHash('sha256').update(input.url).digest('hex')}`,
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: 'Your pocket is waiting — join your family on Pocket',
        text: invitationEmailText(input),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return 'failed';
    const result: unknown = await response.json();
    return typeof result === 'object' &&
      result !== null &&
      'id' in result &&
      typeof result.id === 'string'
      ? 'sent'
      : 'failed';
  } catch {
    return 'failed';
  }
}
