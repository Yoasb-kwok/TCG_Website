-- Rollback for ADR-008: Admin account management system
-- Reverses 20260817000000_accounts

DROP TABLE IF EXISTS "EmailChangeRequest";
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedAt";
