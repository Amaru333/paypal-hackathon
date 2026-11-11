CREATE TABLE "AssistantAction" (
  "id" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "command" JSONB NOT NULL,
  "baseline" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  CONSTRAINT "AssistantAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssistantAction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssistantAction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AssistantAction_parentId_createdAt_idx" ON "AssistantAction"("parentId", "createdAt");
