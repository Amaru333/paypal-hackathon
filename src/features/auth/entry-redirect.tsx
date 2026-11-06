'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function EntryRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Preserve invitation links created before dedicated routes were introduced.
    const token = new URLSearchParams(window.location.hash.slice(1)).get('invite');
    if (token) router.replace(`/invite#invite=${encodeURIComponent(token)}`);
  }, [router]);
  return null;
}
