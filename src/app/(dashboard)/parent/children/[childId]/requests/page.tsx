import View from '@/features/dashboard/components/requests-view';
import { PocketContent } from '@/features/dashboard/pocket-provider';

export default function Page() {
  return (
    <PocketContent>
      <View />
    </PocketContent>
  );
}
