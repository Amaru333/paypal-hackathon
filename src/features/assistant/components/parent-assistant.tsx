'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  LoaderCircle,
  Plus,
  ChartNoAxesCombined,
  SlidersHorizontal,
  Pause,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { usePocket } from '@/features/dashboard/pocket-provider';
import { assistantApi } from '../api';
import { AssistantCardView } from './assistant-cards';
import {
  visibilityKey,
  type AssistantCard,
  type AssistantReply,
  type BudgetCard,
} from '@/domain/assistant';
import { categories, type Policy } from '@/domain/wallet';
import { money } from '@/features/dashboard/format';

type Turn = { id: number; question: string; reply?: AssistantReply; error?: string };
const toolLabels: Record<string, string> = {
  analyze_family: 'Family spending checked',
  analyze_spending: 'Spending checked',
  get_budget: 'Budget loaded',
  get_requests: 'Requests checked',
  propose_top_up: 'Extra budget prepared',
  propose_budget: 'Budget prepared',
  propose_freeze: 'Spending controls prepared',
  propose_vault_release: 'Vault release prepared',
};
export function ParentAssistant() {
  const { data } = usePocket();
  return <AssistantSession key={visibilityKey(data.children)} />;
}
function AssistantSession() {
  const { data, run, busy: dashboardBusy, setNotice } = usePocket();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(data.childId || '');
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [states, setStates] = useState<Record<string, string>>({});
  const [form, setForm] = useState<'top_up' | 'release_vault' | 'budget' | null>(null);
  const [amount, setAmount] = useState('20');
  const [draft, setDraft] = useState<Policy | null>(null);
  const alive = useRef(true);
  const sequence = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const busy = working || dashboardBusy;
  const child = data.children.find((c) => c.id === scope);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, working]);
  function append(
    question: string,
    cards: AssistantCard[],
    text = 'Here’s the current information. Review any proposed changes below.',
  ) {
    setTurns((previous) => [
      ...previous,
      {
        id: ++sequence.current,
        question,
        reply: { text, cards, tools: [], visibilityKey: visibilityKey(data.children) },
      },
    ]);
  }
  async function work(task: () => Promise<void>) {
    if (busy) return;
    setWorking(true);
    setError('');
    try {
      await task();
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : 'Could not complete this request.');
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  async function send(text: string) {
    if (!text.trim() || busy) return;
    const id = ++sequence.current;
    const previous = turns
      .filter((t) => !t.error)
      .map((t) => t.question)
      .slice(-8);
    setTurns((current) => [...current, { id, question: text }]);
    setMessage('');
    await work(async () => {
      try {
        const reply = await assistantApi.chat({
          message: text,
          previous,
          childId: scope || undefined,
          visibilityKey: visibilityKey(data.children),
        });
        if (alive.current)
          setTurns((current) => current.map((t) => (t.id === id ? { ...t, reply } : t)));
      } catch (e) {
        if (alive.current)
          setTurns((current) =>
            current.map((t) =>
              t.id === id
                ? {
                    ...t,
                    error:
                      e instanceof Error
                        ? e.message
                        : 'The assistant could not complete this request.',
                  }
                : t,
            ),
          );
      }
    });
  }
  async function editBudget(childId = scope) {
    await work(async () => {
      const card = (await assistantApi.insights(childId, 'budget')) as BudgetCard;
      if (alive.current) {
        setScope(childId);
        setDraft(card.policy);
        setForm('budget');
      }
    });
  }
  async function insight(kind: 'analysis' | 'requests') {
    await work(async () => {
      const card =
        !scope && kind === 'analysis'
          ? await assistantApi.family()
          : await assistantApi.insights(scope, kind);
      if (alive.current)
        append(
          kind === 'analysis'
            ? child
              ? `Analyze ${child.name}’s spending`
              : 'Analyze family spending'
            : `Show ${child?.name}’s requests`,
          [card],
        );
    });
  }
  function changeAllowance(dollars: string) {
    if (!draft) return;
    const allowance = Math.round(Number(dollars) * 100);
    const scale = draft.allowance > 0 ? allowance / draft.allowance : 0;
    const limits = { ...draft.limits };
    for (const c of categories) limits[c] = Math.floor(draft.limits[c] * scale);
    limits['Everything else'] += allowance - categories.reduce((sum, c) => sum + limits[c], 0);
    setDraft({ ...draft, allowance, limits });
  }
  async function propose() {
    await work(async () => {
      const command =
        form === 'budget' && draft
          ? {
              kind: 'budget' as const,
              childId: scope,
              policy: {
                allowance: draft.allowance,
                threshold: draft.threshold,
                softLimit: draft.softLimit ?? 1000,
                periodDays: draft.periodDays,
                limits: draft.limits,
              },
            }
          : {
              kind: form as 'top_up' | 'release_vault',
              childId: scope,
              cents: Math.round(Number(amount) * 100),
            };
      const card = await assistantApi.propose(command);
      if (alive.current) {
        append(`Prepare a change for ${child?.name}`, [card], 'Your change is ready to review.');
        setForm(null);
      }
    });
  }
  async function decide(id: string, decision: 'confirm' | 'cancel') {
    if (busy) return;
    setWorking(true);
    setError('');
    await run(async () => {
      const result = await assistantApi.decide(id, decision);
      if (alive.current) setStates((current) => ({ ...current, [id]: result.status }));
      setNotice(
        result.status === 'applied'
          ? 'Change applied. Your dashboard is up to date.'
          : 'Proposal cancelled.',
      );
    });
    if (alive.current) setWorking(false);
  }
  const allocationValid =
    draft && categories.reduce((sum, c) => sum + draft.limits[c], 0) === draft.allowance;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="assistant-launch" variant="outline">
          <Sparkles size={16} />
          Ask Pocket
          <span className="assistant-launch-dot" />
        </Button>
      </DialogTrigger>
      <DialogContent className="parent-assistant-dialog top-0 right-0 left-auto translate-x-0 translate-y-0">
        <header className="assistant-header">
          <div className="assistant-mark">
            <Sparkles size={22} />
          </div>
          <div>
            <DialogTitle>Pocket, for parents</DialogTitle>
            <DialogDescription>Understand the spending. Shape what happens next.</DialogDescription>
          </div>
        </header>
        <div className="assistant-scope">
          <Label htmlFor="assistant-child">Ask about</Label>
          <NativeSelect
            id="assistant-child"
            value={scope}
            disabled={busy}
            onChange={(e) => {
              setScope(e.target.value);
              setForm(null);
              setError('');
            }}
          >
            <option value="">Whole family</option>
            {data.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.privacy?.enabled ? ' · private' : ''}
              </option>
            ))}
          </NativeSelect>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Start a fresh chat"
            disabled={busy}
            onClick={() => {
              setTurns([]);
              setForm(null);
              setError('');
            }}
          >
            <RotateCcw size={16} />
          </Button>
        </div>
        <div className="assistant-scroll">
          {!turns.length && (
            <section className="assistant-welcome">
              <span className="eyebrow">A LITTLE HELP, ALL IN ONE PLACE</span>
              <h2>What’s on your mind?</h2>
              <p>
                Ask for an explanation, explore a spending chart, or turn your family’s rules into a
                budget.
              </p>
              <div className="assistant-prompts">
                {[
                  'How is everyone doing this period?',
                  'Help me set a weekly budget',
                  'What can you help me with?',
                ].map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy || !data.ai}
                    onClick={() => void send(p)}
                  >
                    {p}
                    <span>↗</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="assistant-quick-actions" aria-label="Assistant quick actions">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void insight('analysis')}
            >
              <ChartNoAxesCombined />
              Analyze
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!scope || busy}
              onClick={() => {
                setForm('top_up');
                setError('');
              }}
            >
              <Plus />
              Add budget
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!scope || busy}
              onClick={() => void editBudget()}
            >
              <SlidersHorizontal />
              Set budget
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!scope || busy}
              onClick={() =>
                void work(async () => {
                  const current = (await assistantApi.insights(scope, 'budget')) as BudgetCard;
                  const card = await assistantApi.propose({
                    kind: 'freeze',
                    childId: scope,
                    frozen: !current.policy.frozen,
                  });
                  if (alive.current) append('Change spending controls', [card]);
                })
              }
            >
              <Pause />
              {child?.frozen ? 'Resume' : 'Pause'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!scope || busy}
              onClick={() => {
                setForm('release_vault');
                setError('');
              }}
            >
              <Wallet />
              Vault
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!scope || busy}
              onClick={() => void insight('requests')}
            >
              Requests
            </Button>
          </div>
          {!scope && (
            <p className="assistant-hint">
              Choose a child for quick actions, or name them in your message.
            </p>
          )}
          {!data.ai && (
            <p className="assistant-private-note">
              AI chat isn’t configured. Quick actions, charts, and budget tools are still available.
            </p>
          )}
          {turns.map((turn) => (
            <article className="assistant-turn" key={turn.id}>
              <p className="assistant-question">{turn.question}</p>
              {turn.reply && (
                <>
                  <div className="assistant-answer">
                    <Sparkles size={15} />
                    <p>{turn.reply.text}</p>
                  </div>
                  {!!turn.reply.tools.length && (
                    <div className="assistant-tool-trace" aria-label="Tools used">
                      {turn.reply.tools.map((tool, i) => (
                        <span key={i}>
                          {tool.ok ? '✓' : '!'} {toolLabels[tool.name] || 'Tool checked'}
                          {tool.ok ? '' : ' · needs clarification'}
                        </span>
                      ))}
                    </div>
                  )}
                  {turn.reply.cards.map((card, index) => (
                    <AssistantCardView
                      key={card.type === 'action' ? card.id : index}
                      card={card}
                      busy={busy}
                      status={card.type === 'action' ? states[card.id] : undefined}
                      onDecision={(id, decision) => void decide(id, decision)}
                      onEditBudget={(id) => void editBudget(id)}
                    />
                  ))}
                </>
              )}
              {turn.error && (
                <p className="assistant-error" role="alert">
                  {turn.error}{' '}
                  <button type="button" disabled={busy} onClick={() => void send(turn.question)}>
                    Try again
                  </button>
                </p>
              )}
            </article>
          ))}
          {form && scope && (
            <form
              className="assistant-card assistant-edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                void propose();
              }}
            >
              <span className="eyebrow">{child?.name} · PREPARE A CHANGE</span>
              <h3>
                {form === 'budget'
                  ? 'Make room for their week'
                  : form === 'top_up'
                    ? 'A little extra spending budget'
                    : 'Release saved vault budget'}
              </h3>
              {form === 'budget' && draft ? (
                <>
                  <Label>
                    Allowance ($)
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.01"
                      required
                      value={draft.allowance / 100}
                      onChange={(e) => changeAllowance(e.target.value)}
                    />
                  </Label>
                  <Label>
                    Renews every
                    <NativeSelect
                      value={draft.periodDays}
                      onChange={(e) => setDraft({ ...draft, periodDays: Number(e.target.value) })}
                    >
                      <option value={1}>Day</option>
                      <option value={7}>Week</option>
                      <option value={30}>30 days</option>
                    </NativeSelect>
                  </Label>
                  <div className="assistant-budget-fields">
                    {categories.map((c) => (
                      <Label key={c}>
                        {c} ($)
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={draft.limits[c] / 100}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              limits: {
                                ...draft.limits,
                                [c]: Math.round(Number(e.target.value) * 100),
                              },
                            })
                          }
                        />
                      </Label>
                    ))}
                  </div>
                  <p className={allocationValid ? 'form-note' : 'assistant-error'}>
                    Allocated {money(categories.reduce((s, c) => s + draft.limits[c], 0))} of{' '}
                    {money(draft.allowance)}
                  </p>
                  <Label>
                    Ask before purchases over ($)
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.01"
                      required
                      value={draft.threshold / 100}
                      onChange={(e) =>
                        setDraft({ ...draft, threshold: Math.round(Number(e.target.value) * 100) })
                      }
                    />
                  </Label>
                  <Label>
                    Soft Decline coverage ($)
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      required
                      value={(draft.softLimit ?? 1000) / 100}
                      onChange={(e) =>
                        setDraft({ ...draft, softLimit: Math.round(Number(e.target.value) * 100) })
                      }
                    />
                  </Label>
                </>
              ) : (
                <Label>
                  Amount ($)
                  <Input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </Label>
              )}
              <p className="form-note">
                You’ll review exact values before applying. This changes spending permissions; it
                does not transfer cash.
              </p>
              <div className="assistant-card-actions">
                <Button disabled={busy || (form === 'budget' && !allocationValid)} type="submit">
                  Review change
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={busy}
                  onClick={() => setForm(null)}
                >
                  Dismiss
                </Button>
              </div>
            </form>
          )}
          {error && (
            <p className="assistant-error" role="alert">
              {error}
            </p>
          )}
          {working && (
            <div className="assistant-thinking" role="status">
              <LoaderCircle className="animate-spin" size={17} />
              Checking family data and preparing your response…
            </div>
          )}
          <div ref={end} />
        </div>
        <form
          className="assistant-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(message);
          }}
        >
          <Label className="sr-only" htmlFor="assistant-message">
            Message Pocket
          </Label>
          <Textarea
            id="assistant-message"
            rows={2}
            value={message}
            maxLength={1500}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              child
                ? `Ask about ${child.name}, or request a change…`
                : 'Ask about your family’s spending…'
            }
            disabled={busy || !data.ai}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(message);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={busy || !data.ai || !message.trim()}
          >
            <Send size={18} />
          </Button>
          <p>
            Changes need your review. Teen privacy is respected. Chat clears when family privacy
            changes.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
