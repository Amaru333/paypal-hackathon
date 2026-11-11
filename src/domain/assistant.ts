import { z } from 'zod';
import { categories, type Policy } from './wallet';

const childId = z.string().min(1).max(128);
const cents = z.number().int().min(1).max(100000);
export const assistantCommand = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('top_up'), childId, cents }).strict(),
  z.object({ kind: z.literal('release_vault'), childId, cents }).strict(),
  z.object({ kind: z.literal('freeze'), childId, frozen: z.boolean() }).strict(),
  z
    .object({
      kind: z.literal('budget'),
      childId,
      policy: z
        .object({
          allowance: z.number().int(),
          threshold: z.number().int(),
          softLimit: z.number().int(),
          periodDays: z.number().int(),
          limits: z
            .object({
              Food: z.number().int(),
              Groceries: z.number().int(),
              Transport: z.number().int(),
              'Everything else': z.number().int(),
            })
            .strict(),
        })
        .strict(),
    })
    .strict(),
]);
export type AssistantCommand = z.infer<typeof assistantCommand>;
export type ActionCard = {
  type: 'action';
  id: string;
  childId: string;
  childName: string;
  command: AssistantCommand;
  before: Policy;
  vaultBalance: number;
  expiresAt: string;
};
export type AnalysisCard = {
  type: 'analysis';
  childId: string;
  childName: string;
  private: boolean;
  spent: number;
  reserved: number;
  remaining: number;
  allowance: number;
  renewsAt: string;
  categories?: { name: string; cents: number }[];
  daily?: { date: string; cents: number }[];
  purchases?: { name: string; cents: number; count: number }[];
  forecast?: {
    status: string;
    dailyRateCents: number | null;
    projectedEndCents: number | null;
    runsOutAt: string | null;
  };
};
export type BudgetCard = {
  type: 'budget';
  childId: string;
  childName: string;
  policy: Policy;
  vaultBalance: number;
};
export type RequestsCard = {
  type: 'requests';
  childId: string;
  childName: string;
  requests: { id: string; cents: number; status: string; reason: string }[];
};
export type FamilyCard = {
  type: 'family';
  childName: 'Whole family';
  children: {
    id: string;
    name: string;
    private: boolean;
    spent: number;
    reserved: number;
    remaining: number;
    allowance: number;
    frozen: boolean;
    requests: number;
  }[];
};
export type AssistantCard = ActionCard | AnalysisCard | BudgetCard | RequestsCard | FamilyCard;
export type AssistantReply = {
  text: string;
  cards: AssistantCard[];
  tools: { name: string; ok: boolean }[];
  visibilityKey: string;
};
export const assistantToolNames = [
  'analyze_family',
  'analyze_spending',
  'get_budget',
  'get_requests',
  'propose_top_up',
  'propose_budget',
  'propose_freeze',
  'propose_vault_release',
] as const;

export const categorySchema = {
  type: 'object',
  additionalProperties: false,
  required: [...categories],
  properties: Object.fromEntries(categories.map((c) => [c, { type: 'integer' }])),
};
export const policyToolSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['allowance', 'threshold', 'softLimit', 'periodDays', 'limits'],
  properties: {
    allowance: { type: 'integer' },
    threshold: { type: 'integer' },
    softLimit: { type: 'integer' },
    periodDays: { type: 'integer', enum: [1, 7, 30] },
    limits: categorySchema,
  },
};
export function visibilityKey(children: { id: string; privacy?: { enabled: boolean } }[]) {
  return JSON.stringify(
    children
      .map((c) => [c.id, !!c.privacy?.enabled])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}
