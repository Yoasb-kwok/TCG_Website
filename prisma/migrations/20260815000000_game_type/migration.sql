-- ADR-006: Game Type System — up migration
-- Creates GameType table, adds gameTypeId FKs to Product and TaxonomyOption

-- 1. Create GameType table
CREATE TABLE IF NOT EXISTS "GameType" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL UNIQUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed default game type (Pokémon)
INSERT INTO "GameType" ("id", "name", "slug", "sortOrder", "isActive")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Pokémon',
  'pokemon',
  0,
  true
) ON CONFLICT ("slug") DO NOTHING;

-- 3. Add gameTypeId to Product (required, backfill to Pokémon)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gameTypeId" TEXT;

UPDATE "Product"
SET "gameTypeId" = '00000000-0000-0000-0000-000000000001'
WHERE "gameTypeId" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "gameTypeId" SET NOT NULL;

-- Drop old FK constraint if it exists from a previous run, then add
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_gameTypeId_fkey";
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_gameTypeId_fkey"
  FOREIGN KEY ("gameTypeId") REFERENCES "GameType"("id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "Product_gameTypeId_idx" ON "Product"("gameTypeId");

-- 4. Add gameTypeId to TaxonomyOption (nullable)
ALTER TABLE "TaxonomyOption" ADD COLUMN IF NOT EXISTS "gameTypeId" TEXT;

-- Backfill: PRODUCT_TYPE stays null (shared), all others → Pokémon
UPDATE "TaxonomyOption"
SET "gameTypeId" = '00000000-0000-0000-0000-000000000001'
WHERE "kind" != 'PRODUCT_TYPE' AND "gameTypeId" IS NULL;

ALTER TABLE "TaxonomyOption" DROP CONSTRAINT IF EXISTS "TaxonomyOption_gameTypeId_fkey";
ALTER TABLE "TaxonomyOption"
  ADD CONSTRAINT "TaxonomyOption_gameTypeId_fkey"
  FOREIGN KEY ("gameTypeId") REFERENCES "GameType"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "TaxonomyOption_gameTypeId_idx" ON "TaxonomyOption"("gameTypeId");
