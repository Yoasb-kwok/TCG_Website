-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('PICKUP', 'PREPAID', 'COD');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shippingMethod" "ShippingMethod" NOT NULL DEFAULT 'PREPAID';
