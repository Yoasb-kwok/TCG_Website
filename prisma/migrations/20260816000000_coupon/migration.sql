-- ADR-007: Coupon management system
-- Up migration: create Coupon table

CREATE TABLE IF NOT EXISTS "Coupon" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name"        TEXT NOT NULL,
    "code"        TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "quantity"    INTEGER NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
