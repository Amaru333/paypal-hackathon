import View from '@/features/dashboard/components/family-view';
import { PocketContent } from '@/features/dashboard/pocket-provider';

export default function Page() {
  return (
    <PocketContent>
      <View />
    </PocketContent>
  );
}
