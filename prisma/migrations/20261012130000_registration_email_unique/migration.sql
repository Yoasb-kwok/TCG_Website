-- Restore duplicate-email protection for tournament signups.
-- Legacy phone-only rows keep email NULL. PostgreSQL unique indexes allow
-- multiple NULLs, so those rows do not conflict.
-- If two rows already share a non-null email on the same tournament, dedupe
-- them before applying this migration.
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_email_key"
ON "TournamentRegistration"("tournamentId", "email");
