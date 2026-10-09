-- CreateEnum
CREATE TYPE "PosPaymentMethod" AS ENUM ('CASH', 'PAYME', 'FPS', 'CARD');

-- CreateEnum
CREATE TYPE "PosExpenseCategory" AS ENUM ('GOODS', 'RENT', 'WAGES', 'SUPPLIES', 'UTILITIES', 'OTHER');

-- CreateTable
CREATE TABLE "PosSale" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PosPaymentMethod" NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PosSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PosSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosExpense" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "PosExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PosExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosReceipt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "expenseId" TEXT NOT NULL,

    CONSTRAINT "PosReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosSale_createdAt_idx" ON "PosSale"("createdAt");

-- CreateIndex
CREATE INDEX "PosSale_voided_createdAt_idx" ON "PosSale"("voided", "createdAt");

-- CreateIndex
CREATE INDEX "PosSaleItem_saleId_sortIndex_idx" ON "PosSaleItem"("saleId", "sortIndex");

-- CreateIndex
CREATE INDEX "PosExpense_createdAt_idx" ON "PosExpense"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosReceipt_expenseId_key" ON "PosReceipt"("expenseId");

-- CreateIndex
CREATE INDEX "PosReceipt_createdAt_idx" ON "PosReceipt"("createdAt");

-- CreateIndex
CREATE INDEX "PosReceipt_variantId_idx" ON "PosReceipt"("variantId");

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
