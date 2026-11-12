import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { database } from '../src/server/db/client';
import { hashPassword, verifyPassword } from '../src/server/auth/password';

// Add an isolated recording family. Never reset existing users or fabricate payments.
const db = database();
const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`;
const email = `recording-${suffix}@example.com`;
const username = `alex-${suffix}`;
const password = randomBytes(18).toString('base64url');
const passwordHash = hashPassword(password);
const now = new Date();

try {
  await mkdir('.local', { recursive: true });
  const parent = await db.parent.create({
    data: {
      name: 'Jordan',
      email,
      passwordHash,
      children: {
        create: {
          name: 'Alex',
          username,
          passwordHash,
          joinedAt: now,
          budget: {
            create: {
              allowance: 10000,
              threshold: 2500,
              softLimit: 1000,
              food: 1000,
              groceries: 2000,
              transport: 2000,
              other: 5000,
              periodDays: 7,
              periodStart: now,
              frozen: false,
            },
          },
        },
      },
    },
    include: { children: { include: { budget: true } } },
  });
  const saved = await db.parent.findUniqueOrThrow({
    where: { id: parent.id },
    include: { children: { include: { budget: true, _count: { select: { purchases: true } } } } },
  });
  const child = saved.children[0];
  if (
    !verifyPassword(password, saved.passwordHash) ||
    !verifyPassword(password, child.passwordHash!) ||
    child.budget?.allowance !== 10000 ||
    child._count.purchases !== 0
  ) {
    throw new Error('Recording family verification failed.');
  }
  const credentials = {
    createdAt: now.toISOString(),
    parentEmail: email,
    childUsername: username,
    password,
    parentId: parent.id,
    childId: child.id,
    note: 'Private recording accounts. Connect a real sandbox buyer before checkout. No payments or history were seeded.',
  };
  const path = `.local/recording-${suffix}.json`;
  await writeFile(path, JSON.stringify(credentials, null, 2), { flag: 'wx' });
  await writeFile('.local/recording-latest.json', JSON.stringify(credentials, null, 2));
  console.log(`Created and verified recording family. Private credentials: ${path}`);
  console.log('Budget: $100 weekly; Food $10; Groceries $20; Transport $20; Everything else $50.');
  console.log(
    'Approval threshold $25; Soft Decline coverage $10. No purchases or PayPal tokens seeded.',
  );
} finally {
  await db.$disconnect();
}
