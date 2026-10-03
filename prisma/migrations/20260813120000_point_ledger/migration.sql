-- ADR-004: PointLedger table + PointReason enum
-- Email-keyed points ledger. Balance = SUM(delta) WHERE email = ?

CREATE TYPE "PointReason" AS ENUM ('ORDER_EARN', 'TOURNAMENT_EARN', 'ADMIN_ADJUST');

CREATE TABLE "PointLedger" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" "PointReason" NOT NULL,
  "referenceId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PointLedger_email_idx" ON "PointLedger"("email");
CREATE INDEX "PointLedger_email_createdAt_idx" ON "PointLedger"("email", "createdAt");
CREATE INDEX "PointLedger_referenceId_reason_idx" ON "PointLedger"("referenceId", "reason");
