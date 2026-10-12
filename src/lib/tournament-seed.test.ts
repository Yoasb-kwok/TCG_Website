import assert from "node:assert/strict";
import test from "node:test";
import { demoTournamentSeedRows, seedMissingTournaments, type TournamentSeedRow } from "./tournament-seed";

test("demo tournament seed includes the weekly slugs and does not use placeholder ids", () => {
  const rows = demoTournamentSeedRows();
  assert.deepEqual(
    rows.map((row) => row.slug),
    ["standard-sat-12", "beginner-friendly"],
  );
  assert.equal(rows[0]?.startsAt.toISOString(), "2026-10-17T06:00:00.000Z");
  assert.equal(rows[0]?.status, "OPEN");
  assert.equal("id" in (rows[0] ?? {}), false);
});

test("seed creates missing tournaments and skips slugs that already exist", async () => {
  const created: TournamentSeedRow[] = [];
  const result = await seedMissingTournaments({
    async findBySlug(slug) {
      return slug === "standard-sat-12" ? { slug } : null;
    },
    async create(row) {
      created.push(row);
    },
  });

  assert.deepEqual(result.skipped, ["standard-sat-12"]);
  assert.deepEqual(result.created, ["beginner-friendly"]);
  assert.deepEqual(
    created.map((row) => row.slug),
    ["beginner-friendly"],
  );
});
