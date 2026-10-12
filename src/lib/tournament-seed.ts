import { DEMO_TOURNAMENTS } from "@/lib/demo-products";

/** Rows written by `npm run db:seed-tournaments`. Existing slugs are left alone. */
export type TournamentSeedRow = {
  title: string;
  slug: string;
  description: string | null;
  format: string;
  maxPlayers: number;
  entryFee: number;
  prizePool: string | null;
  location: string;
  startsAt: Date;
  registrationDeadline: Date;
  status: "OPEN";
};

export function demoTournamentSeedRows(): TournamentSeedRow[] {
  return DEMO_TOURNAMENTS.map((tournament) => ({
    title: tournament.title,
    slug: tournament.slug,
    description: tournament.description,
    format: tournament.format,
    maxPlayers: tournament.maxPlayers,
    entryFee: tournament.entryFee,
    prizePool: tournament.prizePool,
    location: tournament.location,
    startsAt: new Date(tournament.startsAt),
    registrationDeadline: new Date(tournament.registrationDeadline),
    status: "OPEN",
  }));
}

export async function seedMissingTournaments(db: {
  findBySlug(slug: string): Promise<{ slug: string } | null>;
  create(row: TournamentSeedRow): Promise<void>;
}) {
  const created: string[] = [];
  const skipped: string[] = [];
  for (const row of demoTournamentSeedRows()) {
    const existing = await db.findBySlug(row.slug);
    if (existing) {
      skipped.push(row.slug);
      continue;
    }
    await db.create(row);
    created.push(row.slug);
  }
  return { created, skipped };
}
