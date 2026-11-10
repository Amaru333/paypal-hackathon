ALTER TABLE "Budget" ADD COLUMN "softLimit" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_softLimit_check" CHECK ("softLimit" >= 0 AND "softLimit" <= 1000);
ALTER TABLE "Purchase" ADD COLUMN "allocations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Purchase" ADD COLUMN "warning" TEXT NOT NULL DEFAULT '';
