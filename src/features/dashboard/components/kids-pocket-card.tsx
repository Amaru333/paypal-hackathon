'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { money } from '../format';
import s from './kids-pocket-card.module.css';

type Props = {
  name: string;
  remaining: number;
  allowance: number;
  reserved: number;
  periodName: string;
  date: string;
  frozen: boolean;
};

export function KidsPocketCard({
  name,
  remaining,
  allowance,
  reserved,
  periodName,
  date,
  frozen,
}: Props) {
  const card = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== 'mouse' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    card.current?.style.setProperty('--rx', `${(0.5 - y) * 12}deg`);
    card.current?.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
    card.current?.style.setProperty('--shine', `${x * 100}%`);
  }

  function resetTilt() {
    card.current?.style.setProperty('--rx', '0deg');
    card.current?.style.setProperty('--ry', '0deg');
  }

  return (
    <section className={s.stage} aria-label="Your pocket card">
      <div
        className={s.scene}
        onPointerMove={tilt}
        onPointerLeave={resetTilt}
        onPointerCancel={resetTilt}
      >
        <div className={s.tilt} ref={card}>
          <div className={`${s.card} ${flipped ? s.flipped : ''}`}>
            <div className={`${s.face} ${s.front}`} aria-hidden={flipped}>
              <div className={s.top}>
                <span className={s.brand}>pocket ✳</span>
                <span className={s.status}>{frozen ? 'Ⅱ Paused' : '✦ Room to grow'}</span>
              </div>
              <div className={s.chip} aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className={s.balance}>
                <span>Available to explore</span>
                <strong>{money(remaining)}</strong>
                <small>of {money(allowance)} this period</small>
              </div>
              <div className={s.bottom}>
                <span>{name}’s pocket</span>
                <span>{periodName} allowance</span>
              </div>
              <span className={s.orbit} aria-hidden="true">
                ✳
              </span>
            </div>
            <div className={`${s.face} ${s.back}`} aria-hidden={!flipped}>
              <span className={s.backLabel}>A LITTLE PLAN. BIG POSSIBILITIES.</span>
              <h2>Your next chapter.</h2>
              <dl>
                <div>
                  <dt>Fresh start</dt>
                  <dd>{date}</dd>
                </div>
                <div>
                  <dt>Reserved for purchases</dt>
                  <dd>{money(reserved)}</dd>
                </div>
                <div>
                  <dt>Spending</dt>
                  <dd>{frozen ? 'Paused by your parent' : 'Within your family’s limits'}</dd>
                </div>
              </dl>
              <p>Your Pocket spending budget. Not a payment card.</p>
            </div>
          </div>
        </div>
      </div>
      <div className={s.controls}>
        <span>Your pocket. Your possibilities.</span>
        <button type="button" aria-pressed={flipped} onClick={() => setFlipped(!flipped)}>
          {flipped ? '↶ Show balance' : '↻ Flip card'}
        </button>
      </div>
    </section>
  );
}
