-- CreateTable
CREATE TABLE "CatalogSet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameZhTw" TEXT,
    "nameJa" TEXT,
    "nameEn" TEXT,
    "releaseDate" DATE,
    "regulationMark" TEXT,
    "officialUrl" TEXT,
    "totalCards" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogCard" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "collectorNumber" TEXT NOT NULL,
    "altCollectorNumber" TEXT,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "nameZhTw" TEXT,
    "nameJa" TEXT,
    "nameEn" TEXT,
    "imageUrl" TEXT,
    "imageUrlJa" TEXT,
    "rarity" TEXT,
    "illustrator" TEXT,
    "regulationMark" TEXT,
    "pendingTranslation" BOOLEAN NOT NULL DEFAULT false,
    "missingFields" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogChangelog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setCode" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogChangelog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSet_code_key" ON "CatalogSet"("code");

-- CreateIndex
CREATE INDEX "CatalogSet_releaseDate_idx" ON "CatalogSet"("releaseDate");

-- CreateIndex
CREATE INDEX "CatalogCard_collectorNumber_idx" ON "CatalogCard"("collectorNumber");

-- CreateIndex
CREATE INDEX "CatalogCard_altCollectorNumber_idx" ON "CatalogCard"("altCollectorNumber");

-- CreateIndex
CREATE INDEX "CatalogCard_pendingTranslation_idx" ON "CatalogCard"("pendingTranslation");

-- CreateIndex
CREATE INDEX "CatalogCard_setId_sortIndex_idx" ON "CatalogCard"("setId", "sortIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCard_setId_collectorNumber_key" ON "CatalogCard"("setId", "collectorNumber");

-- CreateIndex
CREATE INDEX "CatalogChangelog_date_idx" ON "CatalogChangelog"("date");

-- CreateIndex
CREATE INDEX "CatalogChangelog_setCode_idx" ON "CatalogChangelog"("setCode");

-- AddForeignKey
ALTER TABLE "CatalogCard" ADD CONSTRAINT "CatalogCard_setId_fkey" FOREIGN KEY ("setId") REFERENCES "CatalogSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
