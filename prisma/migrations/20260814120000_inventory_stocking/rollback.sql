-- ADR-005: Inventory Stocking System — Rollback Migration
-- Reverses all changes from migration.sql

-- 1. Drop ShopSetting table
DROP TABLE IF EXISTS "ShopSetting";

-- 2. Drop StockRecord table
DROP TABLE IF EXISTS "StockRecord";

-- 3. Drop StockState enum
DROP TYPE IF EXISTS "StockState";

-- 4. Remove new columns from ProductVariant
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "criticalThreshold";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "lowThreshold";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "reservedNote";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "reservedStock";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "bookedStock";
