import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Pocket home">
      <span className="brand-mark">p.</span>pocket<span className="brand-dot">✳</span>
    </Link>
  );
}
