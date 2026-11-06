// Local sandbox-only feasibility probe. Never deploy this development helper.
import nextEnv from '@next/env';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const clientId = process.env.PAYPAL_CLIENT_ID;
const secret = process.env.PAYPAL_CLIENT_SECRET;
if (!clientId || !secret) throw new Error('Missing PayPal environment variables');
const api = 'https://api-m.sandbox.paypal.com';
const origin = 'http://127.0.0.1:4381';
const route = `/test/${randomBytes(24).toString('hex')}`;
const setupRequestId = randomUUID();
const tokenRequestId = randomUUID();
const orderRequestId = randomUUID();
const captureRequestId = randomUUID();
let accessToken;
let tokenExpiresAt = 0;
let setupId;
let approvalUrl;
let paymentToken;
let testRun;
let result;

async function raw(path, options) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) {
    // Never log full responses, credentials, bearer tokens, or payer details.
    throw new Error(
      JSON.stringify({
        http: response.status,
        name: data.name ?? data.error,
        issues: data.details?.map((d) => d.issue),
        debugId: data.debug_id,
      }),
    );
  }
  return data;
}

async function request(path, body, requestId) {
  if (!accessToken || Date.now() >= tokenExpiresAt) {
    const auth = await raw('/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    accessToken = auth.access_token;
    tokenExpiresAt = Date.now() + (auth.expires_in - 60) * 1000;
  }
  return raw(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
function page(response, content, code = 200) {
  response.writeHead(code, {
    'Content-Type': 'text/html; charset=utf-8',
    // no-referrer can make browsers send Origin: null on a form POST.
    // Keep same-origin form submissions compatible with the strict origin check,
    // while still withholding the private local URL from external destinations.
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  });
  response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PayPal sandbox vault test</title>
    <style>body{font:17px/1.6 system-ui;max-width:680px;margin:64px auto;padding:0 24px;color:#16283d}h1{line-height:1.2}a{color:#005ac6}button{padding:12px 20px;background:#005ac6;color:white;border:0;border-radius:8px;font:inherit;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f0f4f8;padding:20px;border-radius:8px}.badge{color:#52667b;font-weight:600}</style>
    <body><p class="badge">SANDBOX ONLY · TEST MONEY</p><h1>Save once, test a later payment</h1>${content}</body></html>`);
}

async function chargeOnce() {
  const setup = await request(`/v3/vault/setup-tokens/${setupId}`);
  if (setup.status !== 'APPROVED')
    throw new Error(`Setup status is ${setup.status}. Complete PayPal consent first.`);
  const saved = await request(
    '/v3/vault/payment-tokens',
    {
      payment_source: { token: { id: setupId, type: 'SETUP_TOKEN' } },
    },
    tokenRequestId,
  );
  paymentToken = saved.id;
  if (!paymentToken) throw new Error('PayPal did not return a payment token');
  console.log(JSON.stringify({ check: 'payment_method_saved', passed: true }));
  let order = await request(
    '/v2/checkout/orders',
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: 'Saved payment feasibility test - sandbox only',
          amount: { currency_code: 'USD', value: '1.00' },
        },
      ],
      payment_source: {
        paypal: {
          vault_id: paymentToken,
          stored_credential: { payment_initiator: 'MERCHANT', usage: 'SUBSEQUENT' },
        },
      },
    },
    orderRequestId,
  );
  console.log(
    JSON.stringify({ check: 'saved_payment_order', orderId: order.id, status: order.status }),
  );
  if (order.status === 'APPROVED') {
    order = await request(`/v2/checkout/orders/${order.id}/capture`, {}, captureRequestId);
  }
  // Independently retrieve the final state; do not mistake order creation for payment.
  order = await request(`/v2/checkout/orders/${order.id}`);
  const captures =
    order.purchase_units?.flatMap(
      (p) =>
        p.payments?.captures?.map((c) => ({ id: c.id, status: c.status, amount: c.amount })) ?? [],
    ) ?? [];
  result = {
    check: 'saved_payment_test',
    orderId: order.id,
    status: order.status,
    captures,
    passed:
      order.status === 'COMPLETED' &&
      captures.some(
        (c) =>
          c.status === 'COMPLETED' &&
          c.amount?.value === '1.00' &&
          c.amount?.currency_code === 'USD',
      ),
  };
  console.log(JSON.stringify(result));
  return result;
}

const server = createServer(async (req, res) => {
  try {
    if (req.headers.host !== new URL(origin).host) return page(res, '<p>Invalid host.</p>', 403);
    const url = new URL(req.url, origin);
    if (![route, `${route}/return`, `${route}/cancel`, `${route}/charge`].includes(url.pathname)) {
      return page(res, '<p>Use the private test link printed in the terminal.</p>', 404);
    }
    if (req.method === 'POST' && url.pathname === `${route}/charge`) {
      if (req.headers.origin !== origin) return page(res, '<p>Invalid origin.</p>', 403);
      // One promise per session prevents duplicate submissions from charging twice.
      testRun ??= chargeOnce();
      const outcome = await testRun;
      return page(
        res,
        `<h2>${outcome.passed ? 'Payment completed' : 'Payment needs investigation'}</h2>
        <p>${outcome.passed ? 'The saved payment method completed a $1 sandbox payment without a second PayPal checkout.' : 'The test has not confirmed a completed payment. Share this status in chat.'}</p>
        <pre>${escape(JSON.stringify(outcome, null, 2))}</pre><p>You can return to the chat. Repeating this button will show the same result.</p>`,
      );
    }
    if (req.method !== 'GET' || url.pathname === `${route}/charge`)
      return page(res, '<p>Method not allowed.</p>', 405);
    if (!setupId) return page(res, '<p>Preparing the sandbox test. Refresh shortly.</p>');
    if (result) return page(res, `<pre>${escape(JSON.stringify(result, null, 2))}</pre>`);
    const setup = await request(`/v3/vault/setup-tokens/${setupId}`);
    console.log(JSON.stringify({ check: 'setup_status', status: setup.status }));
    const approved = setup.status === 'APPROVED';
    page(
      res,
      `<p>First, use your <strong>Personal sandbox buyer account</strong> to authorize saving PayPal for future payments to this demo merchant. No payment is taken during that consent step.</p>
      <p>Verified setup status: <strong>${escape(setup.status)}</strong></p>
      ${
        approved
          ? `<p>Consent is approved. The button below saves the payment token on this local server and attempts one $1 USD sandbox payment.</p><form action="${route}/charge" method="post"><button>Run the $1 sandbox payment test</button></form>`
          : `<p><a href="${escape(approvalUrl)}">Open PayPal sandbox consent</a></p><p>After approving, PayPal should bring you back here. If it does not, return to this page and <a href="${route}">refresh the status</a>.</p>`
      }
      <p>This helper keeps the payment token only in server memory. It does not create a child PayPal account or impose category limits inside PayPal.</p>`,
    );
  } catch (error) {
    console.error('Vault test:', error.message);
    page(
      res,
      `<h2>Test needs attention</h2><pre>${escape(error.message)}</pre><p>Share this error in chat. No additional charge will be attempted by refreshing this page.</p>`,
      502,
    );
  }
});

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4381, '127.0.0.1', resolve);
  });
  const setup = await request(
    '/v3/vault/setup-tokens',
    {
      payment_source: {
        paypal: {
          description: 'Sandbox test: save PayPal for a later USD 1.00 demo purchase',
          usage_type: 'MERCHANT',
          usage_pattern: 'IMMEDIATE',
          customer_type: 'CONSUMER',
          permit_multiple_payment_tokens: false,
          experience_context: {
            brand_name: 'Kids Wallet Sandbox Test',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${origin}${route}/return`,
            cancel_url: `${origin}${route}/cancel`,
          },
        },
      },
    },
    setupRequestId,
  );
  setupId = setup.id;
  approvalUrl = setup.links?.find((l) => l.rel === 'approve')?.href;
  if (!setupId || !approvalUrl)
    throw new Error('PayPal did not return a setup token and approval link');
  const approval = new URL(approvalUrl);
  if (
    approval.protocol !== 'https:' ||
    !['sandbox.paypal.com', 'www.sandbox.paypal.com'].includes(approval.hostname)
  ) {
    throw new Error('Unexpected approval URL host');
  }
  console.log(JSON.stringify({ check: 'vault_setup_created', status: setup.status, passed: true }));
  console.log(`Open this local test page: ${origin}${route}`);
} catch (error) {
  console.error('Vault setup failed:', error.message);
  server.close();
  process.exitCode = 1;
}
