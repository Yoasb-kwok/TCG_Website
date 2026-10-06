-- CreateTable
CREATE TABLE "MenuBanner" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL DEFAULT '/products',
    "title" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuBanner_pkey" PRIMARY KEY ("id")
);
