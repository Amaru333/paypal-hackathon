'use client';
import { useState } from 'react';
import s from './landing.module.css';

export function PocketPreview() {
  const [view, setView] = useState<'child' | 'parent'>('child');
  return (
    <div className={s.preview}>
      <div className={s.previewTabs} aria-label="Choose a preview">
        <button type="button" aria-pressed={view === 'child'} onClick={() => setView('child')}>
          Their pocket
        </button>
        <button type="button" aria-pressed={view === 'parent'} onClick={() => setView('parent')}>
          Your peace of mind
        </button>
      </div>
      <div className={s.cardScene}>
        <div className={s.sideNote}>
          <span>↳</span>
          <p>
            A little freedom,
            <br />
            with you beside them.
          </p>
        </div>
        <div className={`${s.walletCard} ${s.backCard}`} aria-hidden="true">
          <span>pocket ✳</span>
          <div className={s.cardPattern} />
        </div>
        <div className={`${s.walletCard} ${s.frontCard}`}>
          <div className={s.cardTop}>
            <span>
              pocket<span>✳</span>
            </span>
            <span>MY POCKET</span>
          </div>
          <div className={s.cardPattern} aria-hidden="true" />
          <div className={s.cardBalance} aria-live="polite">
            <span>{view === 'child' ? 'A LITTLE ROOM TO EXPLORE' : 'THIS WEEK’S ALLOWANCE'}</span>
            <strong>
              {view === 'child' ? '$82' : '$100'}
              <small>.00</small>
            </strong>
            <p>
              {view === 'child'
                ? 'left for little adventures'
                : 'Their independence. Your boundaries.'}
            </p>
          </div>
          <div className={s.cardBottom}>
            <span>MAYA’S POCKET</span>
            <span>Room to grow. ↗</span>
          </div>
        </div>
        <div className={s.notification} aria-live="polite">
          <span className={s.check}>✓</span>
          <div>
            <strong>{view === 'child' ? 'Lunch? You’ve got this.' : 'You’re in the loop.'}</strong>
            <span>
              {view === 'child'
                ? '$12.00 · Within the food budget'
                : 'Purchases over $25 need your approval'}
            </span>
          </div>
          <span className={s.now}>now</span>
        </div>
        <div className={s.spendChip}>
          <span>✦</span>
          <div>
            <strong>Good habits start here</strong>
            <span>One small choice at a time.</span>
          </div>
        </div>
        <span className={s.sceneLabel}>ILLUSTRATIVE PREVIEW · NO PHYSICAL CARD</span>
      </div>
    </div>
  );
}
