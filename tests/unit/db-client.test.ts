import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma, type PrismaClient } from '../../src/generated/prisma/client';
import { database } from '../../src/server/db/client';
import { prismaSchemaKey } from '../../src/server/db/schema-key';

test('separate route bundles share a schema key; added models and fields invalidate it', () => {
  const copy = JSON.parse(JSON.stringify(Prisma));
  assert.equal(prismaSchemaKey(copy), prismaSchemaKey(Prisma));
  const { birthDate: ignored, ...oldFields } = Prisma.ChildScalarFieldEnum;
  void ignored;
  assert.notEqual(
    prismaSchemaKey({ ...Prisma, ChildScalarFieldEnum: oldFields }),
    prismaSchemaKey(Prisma),
  );
  assert.notEqual(
    prismaSchemaKey({ ...Prisma, ModelName: { Child: 'Child' } }),
    prismaSchemaKey(Prisma),
  );
});
test('regeneration replaces a stale cache without ending pools used by other routes', async (t) => {
  const cache = globalThis as typeof globalThis & {
    pocketPrismaClients?: Map<string, PrismaClient>;
    pocketPrisma?: PrismaClient;
  };
  const saved = {
    clients: cache.pocketPrismaClients,
    legacy: cache.pocketPrisma,
    url: process.env.DATABASE_URL,
  };
  let disconnected = 0;
  const stale = {
    child: {
      update: () => {
        throw new Error('Unknown argument birthDate');
      },
    },
    $disconnect: async () => {
      disconnected++;
    },
  } as unknown as PrismaClient;
  cache.pocketPrisma = stale;
  cache.pocketPrismaClients = new Map([['previous-generated-schema', stale]]);
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/unused_test';
  const fresh = database();
  t.after(async () => {
    await fresh.$disconnect();
    cache.pocketPrismaClients = saved.clients;
    cache.pocketPrisma = saved.legacy;
    if (saved.url === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved.url;
  });
  assert.notEqual(fresh, stale);
  assert.equal(typeof fresh.child.update, 'function');
  assert.equal(database(), fresh);
  const otherBundleKey = prismaSchemaKey(JSON.parse(JSON.stringify(Prisma)));
  assert.equal(cache.pocketPrismaClients.get(otherBundleKey), fresh);
  assert.equal(disconnected, 0, 'A route must never close a pool retained by an in-flight request');
  assert.equal(cache.pocketPrismaClients.get('previous-generated-schema'), stale);
});
