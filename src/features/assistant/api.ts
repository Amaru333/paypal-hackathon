import { request } from '@/lib/api-client';
import type {
  ActionCard,
  AssistantCard,
  AssistantCommand,
  AssistantReply,
} from '@/domain/assistant';
export const assistantApi = {
  family: () => request<AssistantCard>('/assistant/insights', { kind: 'family' }),
  chat: (input: { message: string; previous: string[]; childId?: string; visibilityKey: string }) =>
    request<AssistantReply>('/assistant/chat', input),
  insights: (childId: string, kind: 'analysis' | 'budget' | 'requests') =>
    request<AssistantCard>('/assistant/insights', { childId, kind }),
  propose: (command: AssistantCommand) => request<ActionCard>('/assistant/proposals', command),
  decide: (id: string, decision: 'confirm' | 'cancel') =>
    request<{ status: 'applied' | 'cancelled'; alreadyApplied?: boolean }>('/assistant/actions', {
      id,
      decision,
    }),
};
