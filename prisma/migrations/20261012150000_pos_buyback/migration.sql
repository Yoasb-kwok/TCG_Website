-- CreateTable
CREATE TABLE "PosBuyback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'buyback',
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitBuyPrice" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "catalogCardId" TEXT,
    "customerName" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "pokemonId" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "expenseId" TEXT,

    CONSTRAINT "PosBuyback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosBuyback_expenseId_key" ON "PosBuyback"("expenseId");

-- CreateIndex
CREATE INDEX "PosBuyback_createdAt_idx" ON "PosBuyback"("createdAt");

-- CreateIndex
CREATE INDEX "PosBuyback_voided_createdAt_idx" ON "PosBuyback"("voided", "createdAt");

-- CreateIndex
CREATE INDEX "PosBuyback_variantId_idx" ON "PosBuyback"("variantId");

-- CreateIndex
CREATE INDEX "PosBuyback_catalogCardId_idx" ON "PosBuyback"("catalogCardId");
