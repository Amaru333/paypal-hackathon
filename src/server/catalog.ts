import type { MerchantReceipt } from '@/domain/receipt';
import type { products } from '@/domain/wallet';

const market = { name: 'Pocket Market', type: 'General merchandise' };
const receipts: Record<string, MerchantReceipt> = {
  lunch: {
    merchant: { name: 'Pocket Deli', type: 'Prepared meals' },
    currency: 'USD',
    items: [
      {
        id: 'sandwich',
        name: 'Fresh sandwich',
        description: 'Prepared ready-to-eat lunch sandwich',
        quantity: 1,
        unitCents: 900,
      },
      {
        id: 'fruit',
        name: 'Fruit cup',
        description: 'Ready-to-eat fruit side served with lunch',
        quantity: 1,
        unitCents: 200,
      },
      {
        id: 'water',
        name: 'Water',
        description: 'Drink served with the lunch meal',
        quantity: 1,
        unitCents: 100,
      },
    ],
  },
  bus: {
    merchant: { name: 'Pocket Transit', type: 'Public transportation' },
    currency: 'USD',
    items: [
      {
        id: 'bus-pass',
        name: 'Local bus day pass',
        description: 'One day of local public bus travel',
        quantity: 1,
        unitCents: 500,
      },
    ],
  },
  groceries: {
    merchant: market,
    currency: 'USD',
    items: [
      {
        id: 'apples',
        name: 'Apples',
        description: 'Whole apples to take home',
        quantity: 4,
        unitCents: 150,
      },
      {
        id: 'yogurt',
        name: 'Yogurt',
        description: 'Packaged yogurt for the home refrigerator',
        quantity: 4,
        unitCents: 200,
      },
      {
        id: 'granola',
        name: 'Granola',
        description: 'Packaged granola for home',
        quantity: 1,
        unitCents: 400,
      },
    ],
  },
  game: {
    merchant: market,
    currency: 'USD',
    items: [
      {
        id: 'video-game',
        name: 'Adventure video game',
        description: 'A digital entertainment video game; not food or groceries',
        quantity: 1,
        unitCents: 4500,
      },
    ],
  },
  book: {
    merchant: market,
    currency: 'USD',
    items: [
      {
        id: 'paperback',
        name: 'Illustrated adventure paperback',
        description: 'A printed fiction book for personal reading',
        quantity: 1,
        unitCents: 1400,
      },
    ],
  },
  test: {
    merchant: { name: 'Pocket Demo Shop', type: 'Digital goods' },
    currency: 'USD',
    items: [
      {
        id: 'sticker',
        name: 'Sandbox digital sticker',
        description: 'A test-only digital sticker',
        quantity: 1,
        unitCents: 100,
      },
    ],
  },
};

export function receiptFor(product: (typeof products)[number]): MerchantReceipt {
  const receipt = receipts[product.id];
  if (
    !receipt ||
    receipt.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0) !== product.cents
  )
    throw new Error('Catalog receipt does not match the server price.');
  return structuredClone(receipt);
}
