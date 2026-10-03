-- Rollback: Revert StockRecord to cascade-delete on variant deletion
-- WARNING: StockRecords with null variantId will be deleted (data loss)

-- 1. Delete orphaned records (variantId is null)
DELETE FROM "StockRecord" WHERE "variantId" IS NULL;

-- 2. Drop SetNull FK and recreate as Cascade
ALTER TABLE "StockRecord"
  DROP CONSTRAINT IF EXISTS "StockRecord_variantId_fkey";

ALTER TABLE "StockRecord"
  ADD CONSTRAINT "StockRecord_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE CASCADE;

-- 3. Make variantId NOT NULL again
ALTER TABLE "StockRecord"
  ALTER COLUMN "variantId" SET NOT NULL;

-- 4. Drop denormalized columns
ALTER TABLE "StockRecord"
  DROP COLUMN IF EXISTS "productName",
  DROP COLUMN IF EXISTS "variantCondition",
  DROP COLUMN IF EXISTS "variantIsFoil";
