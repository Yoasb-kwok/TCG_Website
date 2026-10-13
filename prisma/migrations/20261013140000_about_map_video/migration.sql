-- Admin-managed how-to-find-us video. Null until an upload is saved.
ALTER TABLE "AboutPageContent" ADD COLUMN "mapVideoUrl" TEXT;
ALTER TABLE "AboutPageContent" ADD COLUMN "mapVideoFilename" TEXT;
ALTER TABLE "AboutPageContent" ADD COLUMN "mapVideoPathname" TEXT;
