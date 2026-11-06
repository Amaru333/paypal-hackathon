import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { database } from '../src/server/db/client';
import { budgetFields } from '../src/server/db/mappers';
import { validatePolicy } from '../src/domain/wallet';
import { migrateStore, type Store } from './legacy-store';

const source =
  process.argv.find((arg) => arg.startsWith('--file='))?.slice(7) || '.local/family.json';
const contents = JSON.parse(await readFile(source, 'utf8'));
const data: Store = contents.version === 1 ? migrateStore(contents) : contents;
if (data.version !== 2 || !data.parent || !Array.isArray(data.children))
  throw new Error('Expected a version 1 or 2 Pocket family file.');
const email = (
  data.parent.email || process.argv.find((arg) => arg.startsWith('--email='))?.slice(8)
)
  ?.trim()
  .toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error('This legacy parent needs an email. Pass --email=you@example.com.');
const db = database();
try {
  await db.$transaction(
    async (tx) => {
      // Explicit one-time import: conflicts abort the entire transaction; no existing rows are replaced.
      const parent = await tx.parent.create({
        data: { email, name: data.parent!.name, passwordHash: data.parent!.password },
      });
      for (const child of data.children) {
        await tx.child.create({
          data: {
            id: child.id,
            parentId: parent.id,
            name: child.name,
            username: child.username,
            passwordHash: child.password,
            joinedAt: child.joinedAt ? new Date(child.joinedAt) : null,
            budget: {
              create: {
                ...budgetFields(validatePolicy(child.policy)),
                periodStart: new Date(child.period),
              },
            },
            ...(child.invitation
              ? {
                  invitation: {
                    create: {
                      tokenHash: child.invitation.hash,
                      expiresAt: new Date(child.invitation.expiresAt),
                    },
                  },
                }
              : {}),
          },
        });
      }
      for (const purchase of data.purchases) {
        await tx.purchase.create({
          data: {
            ...purchase,
            createdAt: new Date(purchase.createdAt),
            period: new Date(purchase.period),
            attemptedAt: purchase.attemptedAt ? new Date(purchase.attemptedAt) : null,
          },
        });
      }
      if (data.paypal)
        await tx.payPalConnection.create({
          data: { parentId: parent.id, token: data.paypal.token },
        });
    },
    { timeout: 30000 },
  );
  console.log(
    `Imported one family, ${data.children.length} children, and ${data.purchases.length} purchases. Source JSON unchanged. Sign in again; old sessions and in-progress consent flows were not imported.`,
  );
} finally {
  await db.$disconnect();
}
