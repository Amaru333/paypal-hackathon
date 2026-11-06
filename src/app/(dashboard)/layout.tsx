import { Suspense } from 'react';
import { PocketProvider } from '@/features/dashboard/pocket-provider';
import DashboardShell from '@/features/dashboard/components/dashboard-shell';
import PurchaseDialog from '@/features/dashboard/components/purchase-dialog';
import { DashboardLoadingShell } from '@/features/dashboard/components/dashboard-loading-shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardLoadingShell />}>
      <PocketProvider>
        <DashboardShell>{children}</DashboardShell>
        <PurchaseDialog />
      </PocketProvider>
    </Suspense>
  );
}
