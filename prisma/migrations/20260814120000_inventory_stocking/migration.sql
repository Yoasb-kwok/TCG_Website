-- ADR-005: Inventory Stocking System — Forward Migration
-- Adds bookedStock, reservedStock, reservedNote, lowThreshold, criticalThreshold to ProductVariant
-- Creates StockState enum, StockRecord table, ShopSetting singleton table

-- 1. Add new columns to ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN "bookedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN "reservedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN "reservedNote" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN "lowThreshold" INTEGER;
ALTER TABLE "ProductVariant" ADD COLUMN "criticalThreshold" INTEGER;

-- 2. Create StockState enum
CREATE TYPE "StockState" AS ENUM ('BOOKED', 'ARRIVED');

-- 3. Create StockRecord table
CREATE TABLE "StockRecord" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "state" "StockState" NOT NULL DEFAULT 'BOOKED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" TIMESTAMP(3),
    "arrivalNote" TEXT,
    CONSTRAINT "StockRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockRecord_variantId_idx" ON "StockRecord"("variantId");
CREATE INDEX "StockRecord_state_idx" ON "StockRecord"("state");

ALTER TABLE "StockRecord" ADD CONSTRAINT "StockRecord_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE;

-- 4. Create ShopSetting singleton table
CREATE TABLE "ShopSetting" (
    "id" TEXT NOT NULL,
    "defaultLowThreshold" INTEGER NOT NULL DEFAULT 5,
    "defaultCriticalThreshold" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopSetting_pkey" PRIMARY KEY ("id")
);

-- Insert default singleton row
INSERT INTO "ShopSetting" ("id", "updatedAt") VALUES ('default', NOW());
