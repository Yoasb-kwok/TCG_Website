-- POS commercial fields live on the variant, next to barcode / price / stock.
-- Null prices mean "not set". memberDiscount and pointsProduct are yes/no flags
-- from the 银豹 export (the discount rate itself is not in that file).
ALTER TABLE "ProductVariant" ADD COLUMN "cost" DOUBLE PRECISION;
ALTER TABLE "ProductVariant" ADD COLUMN "wholesalePrice" DOUBLE PRECISION;
ALTER TABLE "ProductVariant" ADD COLUMN "memberPrice" DOUBLE PRECISION;
ALTER TABLE "ProductVariant" ADD COLUMN "memberDiscount" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductVariant" ADD COLUMN "pointsProduct" BOOLEAN NOT NULL DEFAULT false;
