'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <h2>This pocket could not be loaded.</h2>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
