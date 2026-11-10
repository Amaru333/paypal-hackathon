ALTER TABLE "Budget" ADD COLUMN "vaultEnabled" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "vaultBalance" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "walletBonus" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Budget" ADD CONSTRAINT "vault_balance_nonnegative" CHECK ("vaultBalance" >= 0), ADD CONSTRAINT "wallet_bonus_nonnegative" CHECK ("walletBonus" >= 0);
