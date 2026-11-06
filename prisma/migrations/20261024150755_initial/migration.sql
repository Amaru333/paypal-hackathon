-- CreateEnum
CREATE TYPE "Role" AS ENUM ('parent', 'child');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('approval', 'ready', 'processing', 'paid', 'declined', 'blocked');

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "childId" TEXT NOT NULL,
    "allowance" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "food" INTEGER NOT NULL,
    "groceries" INTEGER NOT NULL,
    "transport" INTEGER NOT NULL,
    "other" INTEGER NOT NULL,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "periodDays" INTEGER NOT NULL DEFAULT 7,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("childId")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "childId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("childId")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "parentId" TEXT,
    "childId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayPalConnection" (
    "parentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,

    CONSTRAINT "PayPalConnection_pkey" PRIMARY KEY ("parentId")
);

-- CreateTable
CREATE TABLE "PayPalSetup" (
    "parentId" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayPalSetup_pkey" PRIMARY KEY ("parentId")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptedAt" TIMESTAMP(3),
    "period" TIMESTAMP(3) NOT NULL,
    "status" "PurchaseStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" TEXT,
    "captureId" TEXT,
    "error" TEXT,
    "parentApproved" BOOLEAN NOT NULL DEFAULT false,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parent_email_key" ON "Parent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Child_username_key" ON "Child"("username");

-- CreateIndex
CREATE INDEX "Child_parentId_createdAt_idx" ON "Child"("parentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_parentId_idx" ON "Session"("parentId");

-- CreateIndex
CREATE INDEX "Session_childId_idx" ON "Session"("childId");

-- CreateIndex
CREATE INDEX "LoginAttempt_identity_createdAt_idx" ON "LoginAttempt"("identity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayPalSetup_requestId_key" ON "PayPalSetup"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_orderId_key" ON "Purchase"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_captureId_key" ON "Purchase"("captureId");

-- CreateIndex
CREATE INDEX "Purchase_childId_status_period_idx" ON "Purchase"("childId", "status", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_childId_key_key" ON "Purchase"("childId", "key");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayPalConnection" ADD CONSTRAINT "PayPalConnection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayPalSetup" ADD CONSTRAINT "PayPalSetup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
