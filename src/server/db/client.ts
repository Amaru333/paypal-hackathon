import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { prismaSchemaKey } from './schema-key';

const globalDb = globalThis as typeof globalThis & {
  pocketPrismaClients?: Map<string, PrismaClient>;
};
const schemaKey = prismaSchemaKey(Prisma);

// Lazy initialization allows builds without database access. Never import from client UI.
export function database(): PrismaClient {
  if (!process.env.DATABASE_URL)
    throw new Error('Set DATABASE_URL and run npm run db:migrate before starting Pocket.');
  // Share a pool across route bundles with matching generated metadata. A new
  // model/field inventory gets a new client after generation. Keep older pools
  // available to in-flight requests rather than disconnecting them mid-query.
  const clients = (globalDb.pocketPrismaClients ??= new Map<string, PrismaClient>());
  let client = clients.get(schemaKey);
  if (!client) {
    client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        connectionTimeoutMillis: 5000,
      }),
    });
    clients.set(schemaKey, client);
  }
  return client;
}
