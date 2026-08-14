-- Rollback for ADR-004: PointLedger table + PointReason enum

DROP INDEX IF EXISTS "PointLedger_referenceId_reason_idx";
DROP INDEX IF EXISTS "PointLedger_email_createdAt_idx";
DROP INDEX IF EXISTS "PointLedger_email_idx";
DROP TABLE IF EXISTS "PointLedger";
DROP TYPE IF EXISTS "PointReason";
