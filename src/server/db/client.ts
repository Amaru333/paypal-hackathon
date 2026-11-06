import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalDb = globalThis as typeof globalThis & { pocketPrisma?: PrismaClient };

// Lazy initialization allows builds without database access. Never import from client UI.
export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error('Set DATABASE_URL and run npm run db:migrate before starting Pocket.');
  if (!globalDb.pocketPrisma) {
    globalDb.pocketPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        connectionTimeoutMillis: 5000,
      }),
    });
  }
  return globalDb.pocketPrisma;
}
