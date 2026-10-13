-- Shared shop scoreboard. Staff writes from /pos/scoreboard; the public TV reads /tournaments/live.
-- IF NOT EXISTS so a board created on first request still accepts migrate deploy.
CREATE TABLE IF NOT EXISTS "ShopBoard" (
    "id" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopBoard_pkey" PRIMARY KEY ("id")
);
