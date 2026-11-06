ALTER TABLE "Budget" ADD CONSTRAINT "Budget_amounts_check" CHECK (
  allowance BETWEEN 100 AND 100000 AND threshold BETWEEN 0 AND 100000
  AND food >= 0 AND groceries >= 0 AND transport >= 0 AND other >= 0
  AND food + groceries + transport + other = allowance
  AND "periodDays" IN (1, 7, 30)
);
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_amount_category_check" CHECK (
  cents > 0 AND category IN ('Food', 'Groceries', 'Transport', 'Everything else')
);
ALTER TABLE "Session" ADD CONSTRAINT "Session_owner_check" CHECK (
  (role = 'parent' AND "parentId" IS NOT NULL AND "childId" IS NULL)
  OR (role = 'child' AND "childId" IS NOT NULL AND "parentId" IS NULL)
);
ALTER TABLE "Child" ADD CONSTRAINT "Child_joined_credentials_check" CHECK (
  "joinedAt" IS NULL OR (username IS NOT NULL AND "passwordHash" IS NOT NULL)
);
