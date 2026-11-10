import { z } from 'zod';
import { categories, type Category } from '@/domain/wallet';
import {
  summarizeClassification,
  type MerchantReceipt,
  type ItemClassification,
} from '@/domain/receipt';

export function parseItemClassification(
  value: unknown,
  receipt: MerchantReceipt,
): ItemClassification[] {
  const parsed = z
    .object({
      items: z
        .array(
          z
            .object({
              id: z.string(),
              category: z.enum(categories),
              confidence: z.number().finite().min(0).max(1),
              explanation: z.string().trim().min(1).max(400),
            })
            .strict(),
        )
        .min(1)
        .max(20),
    })
    .strict()
    .parse(value);
  const ids = new Set(parsed.items.map((item) => item.id));
  if (
    parsed.items.length !== receipt.items.length ||
    ids.size !== parsed.items.length ||
    receipt.items.some((item) => !ids.has(item.id))
  )
    throw new Error('Classification must match every receipt item exactly once.');
  return receipt.items.map((item) => parsed.items.find((result) => result.id === item.id)!);
}

export function catalogClassification(
  product: { category: Category },
  receipt: MerchantReceipt,
  failed = false,
) {
  const items = receipt.items.map((item) => ({
    id: item.id,
    category: product.category,
    confidence: null,
    explanation: 'Uses the server catalog category. This is not an AI classification.',
  }));
  return {
    ...summarizeClassification(receipt, items),
    items,
    needsReview: failed,
    explanation: failed
      ? 'AI classification was unavailable or invalid. Catalog fallback requires parent review.'
      : 'AI is off. This checkout uses the server catalog category.',
    source: failed ? 'Shop catalog (AI unavailable)' : 'Shop catalog (AI off)',
  };
}
