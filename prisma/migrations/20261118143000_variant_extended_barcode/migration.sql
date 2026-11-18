-- Second POS code from the 银豹「擴展條碼」 column.
-- Null means the SKU has no extra code. A present value is unique on its own;
-- import also refuses a value that matches another variant's primary barcode.
ALTER TABLE "ProductVariant" ADD COLUMN "extendedBarcode" TEXT;

CREATE UNIQUE INDEX "ProductVariant_extendedBarcode_key" ON "ProductVariant"("extendedBarcode");
