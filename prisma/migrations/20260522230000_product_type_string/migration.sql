-- 商品類型改為字串，與標籤管理 PRODUCT_TYPE 一致（可新增禮盒等）
ALTER TABLE "Product" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

DROP TYPE IF EXISTS "ProductType";
