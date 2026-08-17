-- ADR-008: Admin account management system
-- Up migration: EmailChangeRequest table + User.deletedAt soft-delete column

CREATE TABLE IF NOT EXISTS "EmailChangeRequest" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"      TEXT NOT NULL UNIQUE,
    "oldEmail"    TEXT NOT NULL,
    "newEmail"    TEXT NOT NULL,
    "otpHash"     TEXT,
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "expiresAt"   TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "EmailChangeRequest_status_idx" ON "EmailChangeRequest"("status");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
