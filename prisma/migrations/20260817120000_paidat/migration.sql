-- Migration: Transaction.paidAt — payment anchor for monthly revenue report
-- ADR-009 Decision 3: set when status enters a money-received status.

ALTER TABLE "Transaction" ADD COLUMN "paidAt" TIMESTAMP(3);

-- Backfill: existing money-received transactions get paidAt = createdAt.
-- True historical payment dates are unrecoverable; approximation per ADR-009.
UPDATE "Transaction"
SET "paidAt" = "createdAt"
WHERE "status" IN ('PAID', 'SHIPPED', 'COMPLETED', 'NOT_REQUIRED');

-- Report queries filter on paidAt ranges
CREATE INDEX "Transaction_paidAt_idx" ON "Transaction"("paidAt");
