-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cardCategory" TEXT;

-- DropIndex (external API IDs no longer unique)
DROP INDEX IF EXISTS "Product_externalCardId_key";
