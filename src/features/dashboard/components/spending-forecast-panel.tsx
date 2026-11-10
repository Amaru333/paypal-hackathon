'use client';
import { useId, useState } from 'react';
import { forecastBalanceAt, type SpendingForecast } from '@/domain/forecast';
import { money } from '../format';
import styles from './spending-forecast.module.css';

const formatDate = (value: string | number, timeZone?: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
const dayName = (value: string, timeZone?: string) =>
  new Date(value).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone,
  });
const rateMoney = (cents: number) => (cents > 0 && cents < 1 ? '<$0.01' : money(Math.round(cents)));

export function SpendingForecastPanel({
  forecast: f,
  timeZone,
}: {
  forecast: SpendingForecast;
  timeZone?: string;
}) {
  const date = (value: string | number) => formatDate(value, timeZone);
  const chartId = useId();
  const [position, setPosition] = useState<number | null>(null);
  const start = Date.parse(f.startsAt);
  const now = Date.parse(f.asOf);
  const end = Math.max(now, Date.parse(f.renewsAt));
  const projected = f.projected.length > 0;
  const inspectEnd = projected ? end : now;
  const inspectTime = position === null ? now : start + ((inspectEnd - start) * position) / 100;
  const inspected = forecastBalanceAt(f, inspectTime);
  const x = (time: number) => ((time - start) / (end - start || 1)) * 640;
  const y = (cents: number) => 210 - (cents / Math.max(1, f.capacityCents)) * 200;
  const path = (points: typeof f.recorded) =>
    points
      .map(
        (point, i) =>
          `${i ? 'L' : 'M'}${x(Date.parse(point.at)).toFixed(2)},${y(point.cents).toFixed(2)}`,
      )
      .join(' ');
  const headline =
    f.status === 'at-risk'
      ? `At this pace, you could run out by ${dayName(f.runsOutAt!, timeZone)}.`
      : f.status === 'on-track'
        ? `On pace to have ${money(f.projectedEndCents!)} left at renewal.`
        : f.status === 'paused'
          ? 'Spending is paused. Your forecast is on hold.'
          : f.status === 'reserved'
            ? 'Your available budget is tied up in pending payments.'
            : f.status === 'exhausted'
              ? 'No spending budget is available right now.'
              : f.status === 'renewal-pending'
                ? 'This allowance period has ended. Renewal is pending.'
                : f.status === 'no-spending'
                  ? 'No completed spending to forecast yet.'
                  : f.status === 'building-history'
                    ? 'A little more history will make this useful.'
                    : 'Your forecast is not available yet.';

  return (
    <section className={styles.panel} aria-label="Spending forecast">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>A LOOK AHEAD</span>
          <h2>Your spending forecast</h2>
        </div>
        <span className={styles.tag}>Pace estimate · not a guarantee</span>
      </div>
      <p className={f.status === 'at-risk' ? styles.warning : styles.headline}>{headline}</p>
      {(f.status === 'building-history' || f.status === 'no-spending') && (
        <p className={styles.note}>
          We need at least two completed purchases and {f.minimumHours} hours in this allowance
          period before drawing a projection. Pending payments do not count as completed spending.
        </p>
      )}
      {f.status === 'renewal-pending' && (
        <p className={styles.note}>
          Pending payments can delay vault renewal. Ask your parent to check their payment status.
        </p>
      )}
      {f.status === 'reserved' && (
        <p className={styles.note}>
          Pending payments are reserved, not confirmed spending. Ask your parent to check them
          before trying another purchase.
        </p>
      )}
      <div className={styles.metrics}>
        <div>
          <span>Available now</span>
          <strong>{money(f.availableCents)}</strong>
        </div>
        {f.dailyRateCents !== null ? (
          <div>
            <span>Observed daily pace</span>
            <strong>
              {rateMoney(f.dailyRateCents)}
              <small>/day</small>
            </strong>
          </div>
        ) : (
          <div>
            <span>Completed purchases</span>
            <strong>{f.paidCount}</strong>
          </div>
        )}
        {f.projectedEndCents !== null && (
          <div>
            <span>Estimated at renewal</span>
            <strong>{money(f.projectedEndCents)}</strong>
          </div>
        )}
      </div>
      {f.recorded.length > 0 && (
        <>
          <p className={styles.chartTitle}>Available spending budget (USD)</p>
          <div className={styles.graph}>
            <div className={styles.yAxis} aria-hidden="true">
              <span>{money(f.capacityCents)}</span>
              <span>{money(Math.round(f.capacityCents / 2))}</span>
              <span>$0</span>
            </div>
            <div className={styles.plot}>
              <svg
                viewBox="0 0 640 220"
                preserveAspectRatio="none"
                role="img"
                aria-labelledby={`${chartId}-title ${chartId}-description`}
              >
                <title
                  id={`${chartId}-title`}
                >{`Recorded and projected spending budget, ${date(f.startsAt)} to ${date(end)}`}</title>
                <desc id={`${chartId}-description`}>
                  Vertical axis: available budget in US dollars, zero to {money(f.capacityCents)}.
                  Horizontal axis: time. The solid line reconstructs availability from the current
                  budget and recorded payments.{' '}
                  {projected
                    ? 'The dashed line projects the current spending pace until allowance renewal.'
                    : 'There is no future projection for this snapshot.'}{' '}
                  Current availability: {money(f.availableCents)}.
                </desc>
                {[10, 110, 210].map((line) => (
                  <line
                    key={line}
                    x1="0"
                    x2="640"
                    y1={line}
                    y2={line}
                    className={styles.gridLine}
                  />
                ))}
                <line x1={x(now)} x2={x(now)} y1="10" y2="210" className={styles.nowLine} />
                <path d={path(f.recorded)} className={styles.recordedLine} />
                {projected && <path d={path(f.projected)} className={styles.projectedLine} />}
                {inspected !== null && (
                  <circle cx={x(inspectTime)} cy={y(inspected)} r="4" className={styles.marker} />
                )}
              </svg>
              <div className={styles.xAxis} aria-hidden="true">
                <span>{date(f.startsAt)} · start</span>
                <span>
                  {date(end)} · {f.status === 'renewal-pending' ? 'now' : 'renewal'}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.legend}>
            <span>
              <i className={styles.solidKey} />
              Recorded balance*
            </span>
            {projected && (
              <span>
                <i className={styles.dashedKey} />
                Projected balance
              </span>
            )}
            <span>Vertical line: now ({date(f.asOf)})</span>
          </div>
          {inspectEnd > start && (
            <div className={styles.inspector}>
              <label htmlFor={`${chartId}-inspect`}>Explore the timeline</label>
              <output htmlFor={`${chartId}-inspect`}>
                {inspectTime <= now ? 'Recorded' : 'Projected'} · {date(inspectTime)} ·{' '}
                {inspected === null ? 'Not estimated' : money(inspected)}
              </output>
              <input
                id={`${chartId}-inspect`}
                type="range"
                min="0"
                max="100"
                step="1"
                value={position ?? ((now - start) / (inspectEnd - start)) * 100}
                aria-valuetext={`${inspectTime <= now ? 'Recorded' : 'Projected'} budget on ${date(inspectTime)}: ${inspected === null ? 'not estimated' : money(inspected)}`}
                onChange={(event) => setPosition(Number(event.target.value))}
              />
            </div>
          )}
        </>
      )}
      {f.status === 'at-risk' && f.dailyGuideCents !== null && (
        <p className={styles.guidance}>
          To stretch your remaining budget to renewal, aim for about{' '}
          <strong>{rateMoney(f.dailyGuideCents)} per day</strong>. Category limits and parent
          approvals still apply.
        </p>
      )}
      <details className={styles.method}>
        <summary>How this estimate works</summary>
        <p>
          Daily pace = confirmed spending in this period ÷ elapsed days since the period started,
          including days with no purchases.{' '}
          {f.dailyRateCents !== null && (
            <>
              {money(f.spentCents)} ÷ {f.elapsedDays.toFixed(2)} days = about{' '}
              {rateMoney(f.dailyRateCents)} per day.{' '}
            </>
          )}
          Future availability = available now minus that pace over the time left. Forecasts stop at
          renewal and never assume overdrafts.
        </p>
        <p>
          *Past balances are reconstructed using your current allowance plus released spending
          budget. Budget edits and vault releases can shift the whole history line. Purchases are
          placed at their payment-attempt time, or request time for older records. Pending payments
          ({money(f.reservedCents)}) reduce availability but never the spending rate. Private vault
          savings are excluded.
        </p>
        <p>
          This is a transparent pace calculation, not an AI prediction. New spending, approvals,
          releases, and changed habits can change the result. Snapshot:{' '}
          {new Date(f.asOf).toLocaleString('en-US', { timeZone })}.
        </p>
      </details>
    </section>
  );
}
