import type { Category } from './wallet';

export type MerchantReceipt = {
  merchant: { name: string; type: string };
  currency: 'USD';
  items: { id: string; name: string; description: string; quantity: number; unitCents: number }[];
};
export type ItemClassification = {
  id: string;
  category: Category;
  confidence: number | null;
  explanation: string;
};
export type ReceiptClassification = {
  confidence: number | null;
  needsReview: boolean;
  items: ItemClassification[];
};
export const classificationThreshold = 0.85;

export function summarizeClassification(receipt: MerchantReceipt, items: ItemClassification[]) {
  const totals = new Map<Category, number>();
  for (const item of receipt.items) {
    const classified = items.find((result) => result.id === item.id)!;
    totals.set(
      classified.category,
      (totals.get(classified.category) || 0) + item.quantity * item.unitCents,
    );
  }
  const category = [...totals].sort((a, b) => b[1] - a[1])[0][0];
  const confidence = items.some((item) => item.confidence === null)
    ? null
    : Math.min(...items.map((item) => item.confidence!));
  const mixed = totals.size > 1;
  return {
    category,
    confidence,
    needsReview: mixed || (confidence !== null && confidence < classificationThreshold),
    explanation: mixed
      ? `Mixed receipt categories need parent review. If approved, the full purchase uses ${category}, the largest item subtotal.`
      : `Receipt items classify as ${category}. See the item evidence below.`,
  };
}
