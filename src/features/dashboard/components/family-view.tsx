'use client';
import { usePocket } from '../pocket-provider';
import { dashboardApi } from '../api';
import Family from '@/features/family/components/family';
export default function FamilyView() {
  const { data, busy, setNotice, invitation, setInvitation, parent, selectChild, run } =
    usePocket();

  return (
    parent && (
      <Family
        members={data.children}
        busy={busy}
        invitation={invitation}
        onSelect={selectChild}
        onAdd={async (name, email, birthDate) => {
          return run(async () => {
            setInvitation(await dashboardApi.addChild(name, email, birthDate));
          });
        }}
        onBirthDate={(childId, birthDate) =>
          run(async () => {
            await dashboardApi.birthDate(childId, birthDate);
            setNotice('Birth date set. From age 16, your teen controls Privacy Mode.');
          })
        }
        onInvite={async (childId) => {
          await run(async () => {
            setInvitation(await dashboardApi.invite(childId));
          });
        }}
        onRevoke={async (childId) => {
          await run(async () => {
            await dashboardApi.revoke(childId);
            if (invitation?.childId === childId) setInvitation(null);
            setNotice('Invitation revoked. A fresh link can be created at any time.');
          });
        }}
      />
    )
  );
}
