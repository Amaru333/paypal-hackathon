import type { Purchase } from './wallet';

export type PrivacyState = {
  enabled: boolean;
  eligible: boolean;
  birthDate: string | null;
  age: number | null;
};
export type PrivatePurchase = Pick<Purchase, 'id' | 'cents' | 'status' | 'reason'> & {
  private: true;
};

export function ageOnDate(birthDate: string | null, now = Date.now()): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date(now);
  if (!Number.isFinite(birth.getTime()) || birth.getTime() > now) return null;
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age;
}
export function privacyState(
  child: { birthDate: Date | null; privacyEnabled: boolean },
  now = Date.now(),
): PrivacyState {
  const birthDate = child.birthDate?.toISOString().slice(0, 10) || null;
  const age = ageOnDate(birthDate, now);
  const eligible = age !== null && age >= 16;
  return { birthDate, age, eligible, enabled: eligible && child.privacyEnabled };
}
export function validBirthDate(value: string, now = Date.now()): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value ||
    value < '1900-01-01' ||
    value > new Date(now).toISOString().slice(0, 10)
  )
    throw new Error('Enter a valid birth date between 1900 and today.');
  return parsed;
}
export function privatePurchase(
  purchase: Pick<Purchase, 'id' | 'cents' | 'status' | 'reason'>,
): PrivatePurchase {
  const reason =
    purchase.status === 'approval'
      ? purchase.reason === 'This purchase is above the approval limit.'
        ? 'This amount exceeds your approval threshold.'
        : 'A spending-rule exception needs your review.'
      : purchase.status === 'processing'
        ? 'Payment needs confirmation. The amount remains reserved.'
        : purchase.status === 'paid'
          ? 'Payment completed.'
          : purchase.status === 'declined'
            ? 'Request declined.'
            : purchase.status === 'blocked'
              ? 'Spending controls prevented payment.'
              : 'Ready for payment.';
  return { id: purchase.id, cents: purchase.cents, status: purchase.status, reason, private: true };
}
