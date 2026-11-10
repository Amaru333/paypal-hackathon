import Link from 'next/link';
import { PublicDemo } from './public-demo';
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
          <a href="#public-demo">See the app</a>
          <a href="#how-it-works">How it works</a>
          <a href="#why-paypal">Why PayPal</a>
        </nav>
        <Link className={s.signin} href="/login">
          Sign in <Arrow />
        </Link>
      </header>
      <main id="main">
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.grid} aria-hidden="true" />
          <div className={s.heroLayout}>
            <div className={s.heroCopy}>
              <span className={s.pill}>
                <i /> FAMILY SPENDING, WITH PAYPAL SANDBOX
              </span>
              <h1 id="hero-title">
                Small shortfall.
                <br />
                <span>Still lunch.</span>
              </h1>
              <p>
                A $12 lunch. Only $10 left for food. Pocket can cover the $2 gap from another
                spending category and give teen and parent a check-in. A little guidance, within the
                parent’s limits.
              </p>
              <div className={s.actions}>
                <a className={s.primary} href="#public-demo">
                  See inside Pocket <span>↓</span>
                </a>
                <Link className={s.secondary} href="/signup">
                  Start your family’s pocket <Arrow />
                </Link>
              </div>
              <p className={s.paypalNote}>
                Explore both dashboards and a simulated checkout without signing up. The signed-in
                demo store uses PayPal Orders v2 sandbox.
              </p>
            </div>
            <PublicDemo />
          </div>
          <div className={s.heroFoot}>
            <span>SMALL CHOICES. LIFELONG HABITS.</span>
            <span>
              Independent prototype · test money only <span aria-hidden="true">↘</span>
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
              Soft Decline.
              <br />A check-in, not a dead end.
            </h3>
            <p>
              A small category shortfall can borrow from other available spending categories. Both
              dashboards show the warning. Large purchases still need approval; the total allowance
              and spending pauses still apply.
            </p>
            <div className={s.approvalVisual}>
              <span className={s.shopIcon}>↗</span>
              <div>
                <strong>Lunch covered</strong>
                <span>$10 Food + $2 Everything else</span>
              </div>
              <span className={s.reviewTag}>Sample coverage</span>
            </div>
            <div className={s.orbit} aria-hidden="true">
              <span>✳</span>
            </div>
          </article>
          <article className={`${s.feature} ${s.aiFeature}`}>
            <div>
              <span className={s.featureNumber}>03 — UNDERSTAND THE PURCHASE</span>
              <h3>
                One store.
                <br />
                Different spending decisions.
              </h3>
              <p>
                AI reads receipt items, shows its confidence, and explains the category. Uncertain
                results need parent review. The Teen dashboard also projects spending pace, so
                yesterday’s choices can inform tomorrow’s plans.
              </p>
            </div>
            <div className={s.aiVisual}>
              <span className={s.aiStar}>✦</span>
              <p>Pocket Market · illustrative receipts</p>
              <div>
                <span>Apples, yogurt, granola</span>
                <span>Groceries</span>
              </div>
              <div>
                <span>Adventure video game</span>
                <span>Everything else</span>
              </div>
            </div>
          </article>
        </section>
        <section className={s.paypalCase} id="why-paypal" aria-labelledby="paypal-title">
          <div>
            <span className={s.eyebrow}>THE OPPORTUNITY FOR PAYPAL</span>
            <h2 id="paypal-title">
              Be there for their
              <br />
              first money habits.
            </h2>
          </div>
          <div>
            <p>
              Our business hypothesis: give families a reason to build their first spending habits
              inside the PayPal ecosystem, before a competing app becomes the teen’s default.
            </p>
            <p>
              Pocket connects parent guidance, teen spending, and a path to long-term PayPal
              engagement. The opportunity is to earn that family relationship early, rather than
              leave it to products like Cash App or Greenlight.
            </p>
            <p className={s.caseNote}>
              This is an independent sandbox prototype, not an official PayPal Teen account or a
              claim of proven customer retention.
            </p>
          </div>
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
                'Check the budget. Then pay.',
                'Choose budgets and connect a PayPal sandbox buyer account. In Pocket’s dummy storefront, the teen checks a budget, then pays with PayPal test money. No goods are delivered.',
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
                AI classifies receipt items, reports confidence, explains its decisions, and can
                draft a budget. Low-confidence, mixed-category, or failed analysis requires parent
                review when AI is enabled. AI-off catalog fallback is labeled. Spending forecasts
                use a transparent pace calculation; payment rules are enforced by the app.
              </p>
            </details>
            <details>
              <summary>
                Does the public demo send a payment?<span>+</span>
              </summary>
              <p>
                No. The preview uses sample data and a local simulation with no AI or PayPal API
                calls. To demonstrate an actual sandbox capture, sign in, connect a sandbox buyer,
                and use the demo shop. The receipt then shows the returned order and capture IDs.
              </p>
            </details>
            <details>
              <summary>
                Where do the spending controls apply?<span>+</span>
              </summary>
              <p>
                Inside Pocket’s demo-store checkout, before a PayPal sandbox payment is sent. Pocket
                does not intercept unrelated PayPal transactions. Soft Decline uses available
                spending categories, never the private vault.
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
          <span>Independent prototype. Not affiliated with or endorsed by PayPal.</span>
          <a href="#main">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
