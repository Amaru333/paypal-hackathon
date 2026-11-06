type PayPalResponse = {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    payments?: {
      captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[];
    };
  }[];
};
const base = 'https://api-m.sandbox.paypal.com';
export class PayPalError extends Error {
  constructor(public code: string) {
    super(`PayPal sandbox: ${code}. The payment has not been confirmed.`);
  }
}
export async function paypal(
  path: string,
  body?: unknown,
  requestId?: string,
): Promise<PayPalResponse> {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
    throw new Error('Add sandbox PayPal credentials to .env first.');
  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(20000),
    redirect: 'error',
  });
  if (!tokenResponse.ok) throw new PayPalError('AUTHENTICATION_FAILED');
  const { access_token } = await tokenResponse.json();
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
    redirect: 'error',
  });
  const data = await response.json();
  if (!response.ok)
    throw new PayPalError(data.details?.[0]?.issue ?? data.name ?? 'REQUEST_FAILED');
  return data;
}
