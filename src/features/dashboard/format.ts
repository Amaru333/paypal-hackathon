import type { Purchase } from '@/domain/wallet';
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
export const colors = ['#ee9473', '#739b84', '#8c9dcd', '#b49bc9'];
export const icons = ['↗', '▧', '↔', '✦'];
export const statusLabel: Record<Purchase['status'], string> = {
  approval: 'Needs approval',
  ready: 'Ready to pay',
  processing: 'Payment pending',
  paid: 'Paid',
  declined: 'Declined',
  blocked: 'Outside budget',
};
