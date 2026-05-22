-- AlterEnum
ALTER TYPE "TaxonomyKind" ADD VALUE IF NOT EXISTS 'PRODUCT_TYPE';

-- 預設商品類型標籤
INSERT INTO "TaxonomyOption" ("id", "kind", "value", "label", "sortIndex", "parentValue", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'PRODUCT_TYPE'::"TaxonomyKind", v, l, i, NULL, true, NOW(), NOW()
FROM (VALUES
  ('SINGLE', '單卡', 0),
  ('SEALED_BOX', '封盒', 1),
  ('BOOSTER_PACK', '補充包', 2),
  ('GIFT_BOX', '禮盒', 3),
  ('ACCESSORY', '配件', 4)
) AS t(v, l, i)
WHERE NOT EXISTS (
  SELECT 1 FROM "TaxonomyOption" o
  WHERE o."kind" = 'PRODUCT_TYPE' AND o."value" = t.v AND o."parentValue" IS NULL
);
