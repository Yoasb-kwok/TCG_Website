-- AlterTable
ALTER TABLE "User" ADD COLUMN "pokemonId" TEXT,
ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "User_pokemonId_idx" ON "User"("pokemonId");
