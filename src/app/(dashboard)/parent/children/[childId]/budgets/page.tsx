import View from '@/features/dashboard/components/budgets-view';
import { PocketContent } from '@/features/dashboard/pocket-provider';

export default function Page() {
  return (
    <PocketContent>
      <View />
    </PocketContent>
  );
}
