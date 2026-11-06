import { database } from './client';
import type { Prisma } from '@/generated/prisma/client';

export type Transaction = Prisma.TransactionClient;

// Family-level locks serialize budget reservations and funding changes across processes.
// External PayPal/OpenAI requests must run AFTER this transaction has committed.
export function familyTransaction<T>(parentId: string, work: (tx: Transaction) => Promise<T>) {
  return database().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Parent" WHERE id = ${parentId} FOR UPDATE`;
      return work(tx);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
