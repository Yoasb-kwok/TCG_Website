-- ADR-006: Game Type System — rollback (down) migration
-- Reverses all changes from 20260815000000_game_type

-- 1. Remove gameTypeId from TaxonomyOption
ALTER TABLE "TaxonomyOption" DROP CONSTRAINT IF EXISTS "TaxonomyOption_gameTypeId_fkey";
DROP INDEX IF EXISTS "TaxonomyOption_gameTypeId_idx";
ALTER TABLE "TaxonomyOption" DROP COLUMN IF EXISTS "gameTypeId";

-- 2. Remove gameTypeId from Product
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_gameTypeId_fkey";
DROP INDEX IF EXISTS "Product_gameTypeId_idx";
ALTER TABLE "Product" ALTER COLUMN "gameTypeId" DROP NOT NULL;
ALTER TABLE "Product" DROP COLUMN IF EXISTS "gameTypeId";

-- 3. Drop GameType table
DROP TABLE IF EXISTS "GameType";
