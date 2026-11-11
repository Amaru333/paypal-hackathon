'use client';
import { useRef, useState } from 'react';
import type { Purchase } from '@/domain/wallet';
import { Button } from '@/components/ui/button';
import { usePocket, usePocketState } from '../pocket-provider';
import { money } from '../format';
import { dashboardApi } from '../api';
import { CheckoutReceipt } from '@/features/purchases/components/checkout-receipt';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import styles from '@/features/purchases/components/checkout.module.css';

export default function PurchaseDialog() {
  const { data, selected, requestKey } = usePocketState();
  if (!data || !selected) return null;
  return <LoadedPurchaseDialog key={requestKey} />;
}

function LoadedPurchaseDialog() {
  const { data, busy, error, selected, setSelected, requestKey, changeTab, run } = usePocket();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [phase, setPhase] = useState<'idle' | 'checking' | 'paying' | 'refreshing'>('idle');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const inFlight = useRef(false);
  if (!selected) return null;

  async function checkout(action: 'prepare' | 'pay' | 'refresh') {
    if (inFlight.current || !selected) return;
    inFlight.current = true;
    setPhase(action === 'prepare' ? 'checking' : action === 'pay' ? 'paying' : 'refreshing');
    try {
      const ok = await run(async () => {
        if (action === 'refresh') {
          const snapshot = await dashboardApi.state(data.childId!);
          const current = snapshot.purchases.find((p) => p.id === purchase?.id);
          if (!current)
            throw new Error('Checkout not found. Open Activity to check your purchases.');
          setPurchase(current);
        } else {
          const result =
            action === 'prepare'
              ? await dashboardApi.prepareCheckout(data.childId!, selected.id, requestKey)
              : await dashboardApi.action(purchase!.id, 'retry');
          if (result.purchase.private)
            throw new Error('This checkout is only available to the teen.');
          setPurchase(result.purchase);
        }
      });
      setNeedsRefresh(!ok && action !== 'prepare');
    } finally {
      inFlight.current = false;
      setPhase('idle');
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) setSelected(null);
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className={`pocket-purchase-dialog ${styles.dialog}`}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById(`purchase-${selected.id}`)?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <span className="eyebrow">POCKET DEMO STORE · PAYPAL SANDBOX</span>
        <DialogTitle>{selected.name}</DialogTitle>
        <DialogDescription>{selected.description}</DialogDescription>
        <strong className={styles.price}>{money(selected.cents)}</strong>
        <div className={styles.scrollArea}>
          {!purchase && (
            <p className={styles.context}>
              First, Pocket checks your budget. Then you choose Pay with PayPal to use your parent’s
              connected sandbox payment method. Test money only; no goods are delivered. Checking
              can send a request to your parent if approval is needed.
            </p>
          )}
          {purchase && <CheckoutReceipt purchase={purchase} />}
          {phase !== 'idle' && (
            <p role="status" className={styles.progress}>
              {phase === 'checking'
                ? 'Pocket is classifying the item and checking your budget. No PayPal payment is being sent.'
                : phase === 'paying'
                  ? 'Rechecking your budget and requesting PayPal sandbox payment. Waiting for confirmation…'
                  : 'Checking the saved checkout status…'}
            </p>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {purchase?.status === 'ready' && !needsRefresh && (
            <p className={styles.context}>
              {data.connected
                ? 'Pocket checks again when you pay. Your plan can change if your budget changes.'
                : 'Ask your parent to connect PayPal sandbox from Budgets. No payment has been sent.'}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          {!purchase && (
            <Button
              autoFocus
              disabled={busy}
              className={`button primary full ${styles.pay}`}
              onClick={() => checkout('prepare')}
            >
              {busy ? 'Checking budget…' : 'Check my budget'}
            </Button>
          )}
          {purchase?.status === 'ready' && !needsRefresh && (
            <>
              <Button
                disabled={busy || !data.connected}
                className={`button primary full ${styles.pay}`}
                onClick={() => checkout('pay')}
              >
                {phase === 'paying'
                  ? 'Confirming payment…'
                  : `Pay with PayPal · ${money(purchase.cents)}`}
              </Button>
            </>
          )}
          {purchase && (
            <>
              {purchase.status !== 'paid' && (
                <Button variant="outline" disabled={busy} onClick={() => checkout('refresh')}>
                  Refresh checkout status
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  changeTab('Activity');
                }}
              >
                View activity and receipts
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
