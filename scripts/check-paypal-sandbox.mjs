import nextEnv from '@next/env';
import { randomUUID } from 'node:crypto';

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const base = 'https://api-m.sandbox.paypal.com';
const id = process.env.PAYPAL_CLIENT_ID;
const secret = process.env.PAYPAL_CLIENT_SECRET;
if (!id || !secret) {
  console.error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET.');
  process.exit(1);
}

async function request(path, options) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) {
    // Deliberately exclude credentials, tokens, payer details, and raw responses.
    throw new Error(
      JSON.stringify({
        http: response.status,
        name: data.name ?? data.error,
        issues: data.details?.map((d) => d.issue),
        debugId: data.debug_id,
      }),
    );
  }
  return { http: response.status, data };
}

try {
  const auth = await request('/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  console.log(JSON.stringify({ check: 'sandbox_authentication', http: auth.http, passed: true }));
  const headers = {
    Authorization: `Bearer ${auth.data.access_token}`,
    'Content-Type': 'application/json',
  };
  const captureId = process.argv[2] === '--capture' ? process.argv[3] : undefined;
  const statusId = process.argv[2] === '--status' ? process.argv[3] : undefined;
  if (process.argv.length > 2 && !captureId && !statusId)
    throw new Error(
      'Usage: node scripts/check-paypal-sandbox.mjs [--capture ORDER_ID | --status ORDER_ID]',
    );
  if (statusId) {
    if (!/^[A-Z0-9]+$/.test(statusId)) throw new Error('Invalid order ID');
    const order = await request(`/v2/checkout/orders/${statusId}`, { headers });
    console.log(
      JSON.stringify({
        check: 'order_status',
        http: order.http,
        orderId: order.data.id,
        status: order.data.status,
        captures: order.data.purchase_units?.flatMap(
          (p) =>
            p.payments?.captures?.map((c) => ({ id: c.id, status: c.status, amount: c.amount })) ??
            [],
        ),
      }),
    );
  } else if (captureId) {
    if (!/^[A-Z0-9]+$/.test(captureId)) throw new Error('Invalid order ID');
    const captured = await request(`/v2/checkout/orders/${captureId}/capture`, {
      method: 'POST',
      headers: { ...headers, 'PayPal-Request-Id': `kids-check-${captureId}` },
      body: '{}',
    });
    console.log(
      JSON.stringify({
        check: 'capture',
        http: captured.http,
        orderId: captured.data.id,
        status: captured.data.status,
        captures: captured.data.purchase_units?.flatMap(
          (p) =>
            p.payments?.captures?.map((c) => ({ id: c.id, status: c.status, amount: c.amount })) ??
            [],
        ),
      }),
    );
  } else {
    const order = await request('/v2/checkout/orders', {
      method: 'POST',
      headers: { ...headers, 'PayPal-Request-Id': randomUUID() },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: 'Kids spending companion - sandbox feasibility check',
            amount: { currency_code: 'USD', value: '1.00' },
          },
        ],
      }),
    });
    const details = await request(`/v2/checkout/orders/${order.data.id}`, { headers });
    console.log(
      JSON.stringify({
        check: 'create_and_retrieve_order',
        http: order.http,
        retrieveHttp: details.http,
        orderId: details.data.id,
        status: details.data.status,
        approvalUrl: order.data.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action')
          ?.href,
      }),
    );
    console.log(
      'Capture has NOT been tested. A separate sandbox buyer must approve this order first.',
    );
  }
} catch (error) {
  console.error('Sandbox check failed:', error.message);
  process.exitCode = 1;
}
