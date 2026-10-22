-- Standing catalog buyback offer. Null means unset.
-- These columns do not limit PosBuyback transactions.
ALTER TABLE "ProductVariant" ADD COLUMN "buybackPrice" DOUBLE PRECISION;
ALTER TABLE "ProductVariant" ADD COLUMN "targetBuybackQty" INTEGER;
