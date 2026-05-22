-- AlterTable
ALTER TABLE "Product" ADD COLUMN "setCode" TEXT;
ALTER TABLE "Product" ADD COLUMN "rarityTier" TEXT;
ALTER TABLE "Product" ADD COLUMN "setSortIndex" INTEGER NOT NULL DEFAULT 999;
ALTER TABLE "Product" ADD COLUMN "raritySortIndex" INTEGER NOT NULL DEFAULT 99;

-- CreateIndex
CREATE INDEX "Product_setCode_idx" ON "Product"("setCode");
CREATE INDEX "Product_rarityTier_idx" ON "Product"("rarityTier");
CREATE INDEX "Product_setSortIndex_idx" ON "Product"("setSortIndex");
CREATE INDEX "Product_raritySortIndex_idx" ON "Product"("raritySortIndex");
