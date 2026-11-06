import Link from 'next/link';
import { Welcome } from '@/features/auth/components/welcome';
export default function NotFound() {
  return (
    <Welcome>
      <span className="eyebrow">A LITTLE DETOUR · 404</span>
      <h2>That page isn’t here.</h2>
      <p className="muted">Let’s get you back to familiar ground.</p>
      <Link className="button primary" href="/">
        Back to Pocket ↗
      </Link>
    </Welcome>
  );
}
