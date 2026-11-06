import { EntryRedirect } from '@/features/auth/entry-redirect';
import { LandingPage } from '@/features/landing/landing-page';
export default function Page() {
  return (
    <>
      <EntryRedirect />
      <LandingPage />
    </>
  );
}
