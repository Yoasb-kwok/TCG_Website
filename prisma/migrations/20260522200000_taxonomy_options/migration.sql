-- CreateEnum
CREATE TYPE "TaxonomyKind" AS ENUM ('SET_CODE', 'RARITY', 'CARD_NUMBER', 'CARD_CATEGORY', 'POKEMON_ATTRIBUTE');

-- CreateTable
CREATE TABLE "TaxonomyOption" (
    "id" TEXT NOT NULL,
    "kind" "TaxonomyKind" NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "parentValue" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonomyOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxonomyOption_kind_sortIndex_idx" ON "TaxonomyOption"("kind", "sortIndex");

-- CreateIndex
CREATE INDEX "TaxonomyOption_kind_parentValue_idx" ON "TaxonomyOption"("kind", "parentValue");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyOption_kind_value_parentValue_key" ON "TaxonomyOption"("kind", "value", "parentValue");
