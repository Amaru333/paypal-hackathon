export function rolloverSavings(allowance: number, bonus: number, spent: number, periods: number) {
  return Math.max(0, allowance + bonus - spent) + Math.max(0, periods - 1) * allowance;
}
