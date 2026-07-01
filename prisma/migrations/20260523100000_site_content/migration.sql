-- CMS content for homepage and about page
CREATE TABLE "HomeBanner" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "gradient" TEXT NOT NULL,
  "sortIndex" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomeFeaturedProduct" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HomeFeaturedProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AboutPageContent" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "pageTitle" TEXT NOT NULL,
  "pageSubtitle" TEXT NOT NULL,
  "sections" JSONB NOT NULL,
  "storeAddressZh" TEXT,
  "storeAddressEn" TEXT,
  "storeHours" TEXT,
  "storeMtr" TEXT,
  "mapEmbedUrl" TEXT,
  "contactBody" TEXT NOT NULL,
  "showStoreInfo" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AboutPageContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeFeaturedProduct_productId_key" ON "HomeFeaturedProduct"("productId");
CREATE INDEX "HomeBanner_sortIndex_idx" ON "HomeBanner"("sortIndex");
CREATE INDEX "HomeBanner_active_sortIndex_idx" ON "HomeBanner"("active", "sortIndex");
CREATE INDEX "HomeFeaturedProduct_sortIndex_idx" ON "HomeFeaturedProduct"("sortIndex");

ALTER TABLE "HomeFeaturedProduct"
ADD CONSTRAINT "HomeFeaturedProduct_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
