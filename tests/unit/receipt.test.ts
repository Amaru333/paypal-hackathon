import test from 'node:test';
import assert from 'node:assert/strict';
import { products } from '../../src/domain/wallet';
import { receiptFor } from '../../src/server/catalog';
import { summarizeClassification } from '../../src/domain/receipt';
import { parseItemClassification } from '../../src/server/integrations/receipt-classification';
import { classify } from '../../src/server/integrations/openai';

const groceries = products.find((p) => p.id === 'groceries')!;
const game = products.find((p) => p.id === 'game')!;
const receipt = receiptFor(groceries);
const results = () =>
  receipt.items.map((item) => ({
    id: item.id,
    category: 'Groceries',
    confidence: 0.97,
    explanation: `${item.name} is packaged food for home.`,
  }));

test('server receipts match every catalog price and distinguish items at the same broad merchant', () => {
  for (const product of products) {
    const current = receiptFor(product);
    assert.equal(
      current.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0),
      product.cents,
    );
    assert.equal(new Set(current.items.map((item) => item.id)).size, current.items.length);
  }
  assert.deepEqual(receipt.merchant, receiptFor(game).merchant);
  assert.notDeepEqual(receipt.items, receiptFor(game).items);
  assert.throws(() => receiptFor({ ...groceries, cents: 1 }));
});

test('item validation rejects missing, duplicate, unknown, and malformed classifications', () => {
  assert.equal(parseItemClassification({ items: results().reverse() }, receipt)[0].id, 'apples');
  for (const items of [
    results().slice(1),
    [...results(), results()[0]],
    [results()[0], results()[0], results()[2]],
    results().map((item, i) => (i === 0 ? { ...item, id: 'invented' } : item)),
    results().map((item) => ({ ...item, category: 'Invented category' })),
    results().map((item) => ({ ...item, confidence: -0.1 })),
    results().map((item) => ({ ...item, confidence: 1.1 })),
    results().map((item) => ({ ...item, confidence: NaN })),
    results().map((item) => ({ ...item, explanation: ' ' })),
    results().map((item) => ({ ...item, approvePayment: true })),
  ])
    assert.throws(() => parseItemClassification({ items }, receipt));
});

test('the lowest item confidence and mixed categories force review; threshold is inclusive', () => {
  const valid = parseItemClassification({ items: results() }, receipt);
  assert.equal(summarizeClassification(receipt, valid).needsReview, false);
  assert.equal(
    summarizeClassification(
      receipt,
      valid.map((item) => ({ ...item, confidence: 0.85 })),
    ).needsReview,
    false,
  );
  assert.equal(
    summarizeClassification(
      receipt,
      valid.map((item, i) => ({ ...item, confidence: i === 0 ? 0.84 : 1 })),
    ).needsReview,
    true,
  );
  const mixed = summarizeClassification(
    receipt,
    valid.map((item, i) => ({ ...item, category: i === 0 ? 'Everything else' : item.category })),
  );
  assert.equal(mixed.needsReview, true);
  assert.equal(mixed.category, 'Groceries');
  assert.match(mixed.explanation, /Mixed receipt/);
});

test('transaction AI uses item evidence without sending catalog categories or family data', async (t) => {
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'unit-test-key';
  t.after(() => {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  });
  t.mock.method(
    globalThis,
    'fetch',
    async (url: Parameters<typeof fetch>[0], options?: RequestInit) => {
      assert.equal(String(url), 'https://api.openai.com/v1/responses');
      const request = JSON.parse(String(options?.body));
      assert.deepEqual(JSON.parse(request.input), receipt);
      assert.equal(request.store, false);
      assert.equal(request.text.format.strict, true);
      assert.doesNotMatch(request.input, /password|parentId|childId|allowance|category/);
      return Response.json({
        status: 'completed',
        output: [
          { content: [{ type: 'output_text', text: JSON.stringify({ items: results() }) }] },
        ],
      });
    },
  );
  const analysis = await classify(groceries, receipt);
  assert.equal(analysis.category, 'Groceries');
  assert.equal(analysis.source, 'OpenAI receipt analysis');
  assert.equal(analysis.confidence, 0.97);
  assert.equal(analysis.needsReview, false);
});

test('AI off is explicitly non-AI; malformed, refused, incomplete, and failed responses require review', async (t) => {
  const key = process.env.OPENAI_API_KEY;
  t.after(() => {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  });
  process.env.OPENAI_API_KEY = '';
  const fallback = await classify(groceries, receipt);
  assert.equal(fallback.confidence, null);
  assert.equal(fallback.source, 'Shop catalog (AI off)');
  assert.equal(fallback.needsReview, false);
  process.env.OPENAI_API_KEY = 'unit-test-key';
  for (const [name, response] of [
    [
      'missing items',
      {
        status: 'completed',
        output: [{ content: [{ type: 'output_text', text: '{"items":[]}' }] }],
      },
    ],
    [
      'refusal',
      {
        status: 'completed',
        output: [{ content: [{ type: 'refusal', refusal: 'Not available' }] }],
      },
    ],
    ['incomplete', { status: 'incomplete', output: [] }],
    [
      'invalid JSON',
      { status: 'completed', output: [{ content: [{ type: 'output_text', text: '{bad json' }] }] },
    ],
  ] as const) {
    await t.test(name, async (t) => {
      t.mock.method(globalThis, 'fetch', async () => Response.json(response));
      const result = await classify(groceries, receipt);
      assert.equal(result.needsReview, true);
      assert.equal(result.confidence, null);
      assert.equal(result.source, 'Shop catalog (AI unavailable)');
    });
  }
  await t.test('provider failure', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => {
      throw new TypeError('Provider details must not leak');
    });
    const result = await classify(groceries, receipt);
    assert.equal(result.needsReview, true);
    assert.doesNotMatch(JSON.stringify(result), /Provider details/);
  });
});
