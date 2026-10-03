-- Registration only needs a name and mobile number.
UPDATE "TournamentRegistration" SET "phone" = "id" WHERE "phone" IS NULL OR "phone" = '';

ALTER TABLE "TournamentRegistration" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "TournamentRegistration" ALTER COLUMN "phone" SET NOT NULL;

DROP INDEX "TournamentRegistration_tournamentId_email_key";
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_phone_key" ON "TournamentRegistration"("tournamentId", "phone");
