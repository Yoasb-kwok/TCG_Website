-- Storefront CMS for public single-card recycle listings and homepage service cards.
CREATE TABLE "RecycleListing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecycleListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomeServiceCard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeServiceCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecycleListing_productId_key" ON "RecycleListing"("productId");
CREATE INDEX "RecycleListing_active_sortIndex_idx" ON "RecycleListing"("active", "sortIndex");

ALTER TABLE "RecycleListing" ADD CONSTRAINT "RecycleListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
