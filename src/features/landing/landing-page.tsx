import Link from 'next/link';
import { PocketPreview } from './pocket-preview';
import s from './landing.module.css';

const Arrow = () => <span aria-hidden="true">↗</span>;
export function LandingPage() {
  return (
    <div className={s.page}>
      <a className={s.skip} href="#main">
        Skip to content
      </a>
      <header className={s.header}>
        <Link href="/" className={s.logo} aria-label="Pocket home">
          <span className={s.mark}>p.</span>pocket<span className={s.spark}>✳</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#possibilities">Why Pocket</a>
          <a href="#how-it-works">How it works</a>
          <a href="#questions">Good to know</a>
        </nav>
        <Link className={s.signin} href="/login">
          Sign in <Arrow />
        </Link>
      </header>
      <main id="main">
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.grid} aria-hidden="true" />
          <div className={s.heroCopy}>
            <span className={s.pill}>
              <i /> LITTLE FREEDOM. BIG POSSIBILITIES.
            </span>
            <h1 id="hero-title">
              Their first steps.
              <br />
              <span>Your steady hand.</span>
            </h1>
            <p>
              A little independence goes a long way. Help your kids explore
              <br className={s.desktopBreak} /> spending, with thoughtful boundaries and a pocket of
              their own.
            </p>
            <div className={s.actions}>
              <Link className={s.primary} href="/signup">
                Start your family’s pocket <Arrow />
              </Link>
              <a className={s.secondary} href="#how-it-works">
                Take a closer look <span>↓</span>
              </a>
            </div>
          </div>
          <PocketPreview />
          <div className={s.heroFoot}>
            <span>SMALL CHOICES. LIFELONG HABITS.</span>
            <span>
              Made for growing independence <span aria-hidden="true">↘</span>
            </span>
          </div>
        </section>
        <section className={s.intro} id="possibilities">
          <div>
            <span className={s.eyebrow}>01 / A LITTLE MORE POSSIBILITY</span>
            <h2>
              Room to grow.
              <br />
              <span>Peace of mind built in.</span>
            </h2>
          </div>
          <p>
            From the first lunch bought solo to a purchase worth a conversation. Pocket gives kids
            room to make choices, and parents the tools to guide them.
          </p>
        </section>
        <section className={s.features} aria-label="Pocket features">
          <article className={`${s.feature} ${s.budgetFeature}`}>
            <span className={s.featureNumber}>01 — MAKE IT THEIRS</span>
            <h3>A pocket with a plan.</h3>
            <p>
              Give every dollar a place. Set category limits and an allowance rhythm that fits your
              family.
            </p>
            <div className={s.budgetVisual}>
              <div>
                <span>Weekly allowance</span>
                <strong>
                  $100<span>.00</span>
                </strong>
              </div>
              <div className={s.segments}>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className={s.legend}>
                <span>Food</span>
                <span>Groceries</span>
                <span>Transport</span>
                <span>Other</span>
              </div>
            </div>
          </article>
          <article className={`${s.feature} ${s.controlFeature}`}>
            <span className={s.featureNumber}>02 — STAY CLOSE</span>
            <h3>
              More freedom.
              <br />
              Just enough guidance.
            </h3>
            <p>
              Big purchases start a conversation. Review requests and pause spending when you need
              to.
            </p>
            <div className={s.approvalVisual}>
              <span className={s.shopIcon}>↗</span>
              <div>
                <strong>A little check-in</strong>
                <span>New game · $45.00</span>
              </div>
              <span className={s.reviewTag}>Needs approval</span>
            </div>
            <div className={s.orbit} aria-hidden="true">
              <span>✳</span>
            </div>
          </article>
          <article className={`${s.feature} ${s.aiFeature}`}>
            <div>
              <span className={s.featureNumber}>03 — SAY IT YOUR WAY</span>
              <h3>
                Your words.
                <br />A little help from AI.
              </h3>
              <p>
                Describe your family’s rules in plain English. Get a budget draft you can review,
                adjust, and make your own.
              </p>
            </div>
            <div className={s.aiVisual}>
              <span className={s.aiStar}>✦</span>
              <p>
                “$100 a week. More for food,
                <br />a little for everything else.”
              </p>
              <div>
                <span>✦ Budget draft ready</span>
                <span>Review →</span>
              </div>
            </div>
          </article>
        </section>
        <section className={s.how} id="how-it-works">
          <div className={s.sectionTitle}>
            <span className={s.eyebrow}>02 / SIMPLE FROM THE START</span>
            <h2>
              A small start.
              <br />
              <span>A whole new chapter.</span>
            </h2>
          </div>
          <div className={s.steps}>
            {[
              [
                '01',
                'Make yourself at home.',
                'Create your parent account. This is your space to bring the family together.',
              ],
              [
                '02',
                'Give them their own pocket.',
                'Add your child and share their invitation. They get their own sign-in; you stay in control.',
              ],
              [
                '03',
                'Set the pace. Let them explore.',
                'Choose the limits, connect PayPal, and explore the shop together.',
              ],
            ].map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className={s.faq} id="questions">
          <div>
            <span className={s.eyebrow}>03 / GOOD TO KNOW</span>
            <h2>
              A few things,
              <br />
              <span>before you begin.</span>
            </h2>
            <p>A little clarity goes a long way.</p>
          </div>
          <div className={s.questions}>
            <details>
              <summary>
                Is this a real bank account or payment card?<span>+</span>
              </summary>
              <p>
                No. Pocket provides an app-based spending budget. It does not create a child PayPal
                account or issue a payment card.
              </p>
            </details>
            <details>
              <summary>
                Does this use real money?<span>+</span>
              </summary>
              <p>
                No. Purchases use test money through PayPal. No real funds are transferred and no
                goods are delivered.
              </p>
            </details>
            <details>
              <summary>
                What does AI help with?<span>+</span>
              </summary>
              <p>
                AI turns your instructions into a budget draft and helps classify purchases. Parents
                review budget drafts before saving. Spending rules and approvals are enforced by the
                app.
              </p>
            </details>
            <details>
              <summary>
                Can I change the rules later?<span>+</span>
              </summary>
              <p>
                Yes. You can adjust category budgets and approval thresholds, review purchase
                requests, or pause your child’s spending from the parent dashboard.
              </p>
            </details>
          </div>
        </section>
        <section className={s.cta}>
          <div className={s.grid} aria-hidden="true" />
          <span className={s.pill}>THE NEXT CHAPTER STARTS SMALL</span>
          <h2>
            A little pocket.
            <br />A world of possibility.
          </h2>
          <p>Give them room to grow. Be there as they do.</p>
          <Link className={s.primary} href="/signup">
            Let’s get started <Arrow />
          </Link>
          <span className={s.ctaStar} aria-hidden="true">
            ✳
          </span>
        </section>
      </main>
      <footer className={s.footer}>
        <div>
          <Link href="/" className={s.logo}>
            pocket<span className={s.spark}>✳</span>
          </Link>
          <p>Little freedom. Big possibilities.</p>
        </div>
        <div>
          <a href="#possibilities">Why Pocket</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/login">
            Sign in <Arrow />
          </Link>
        </div>
        <div className={s.footerBottom}>
          <span>Built for families. Designed for possibility.</span>
          <a href="#main">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
