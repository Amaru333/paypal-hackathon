import { Suspense } from 'react';
import { ProtectedLayout } from '@/features/auth/components/protected-layout';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p>Opening your family…</p>}>
      <ProtectedLayout role="parent">{children}</ProtectedLayout>
    </Suspense>
  );
}
