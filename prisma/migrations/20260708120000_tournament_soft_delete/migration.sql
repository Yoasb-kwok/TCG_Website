-- Add soft-delete column to Tournament
ALTER TABLE "Tournament" ADD COLUMN "deletedAt" TIMESTAMP(3);
