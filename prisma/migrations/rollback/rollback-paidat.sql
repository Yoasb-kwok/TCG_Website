-- Rollback: ADR-009 Monthly Revenue Report — remove Transaction.paidAt
-- Reverses 20260817120000_paidat (column + index + backfill).
-- Data loss: paidAt values are dropped; backfill approximation is lost.

DROP INDEX IF EXISTS "Transaction_paidAt_idx";
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "paidAt";
