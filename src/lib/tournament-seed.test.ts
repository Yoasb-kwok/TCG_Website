import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCTION_DEMO_SEED_OVERRIDE_ENV, PRODUCTION_DEMO_SEED_OVERRIDE_VALUE } from "./demo-tournament-guard";
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

test("seed does not write when the environment is production", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      seedMissingTournaments(
        {
          async findBySlug() {
            calls += 1;
            return null;
          },
          async create() {
            calls += 1;
          },
        },
        { VERCEL_ENV: "production", DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/dev" },
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /拒絕寫入示範店賽/);
      assert.equal(error.message.includes("secret"), false);
      assert.equal(error.message.includes("postgresql://"), false);
      return true;
    },
  );
  assert.equal(calls, 0);
});

test("the production seed override must match exactly, then existing slugs are still skipped", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      seedMissingTournaments(
        {
          async findBySlug() {
            calls += 1;
            return null;
          },
          async create() {
            calls += 1;
          },
        },
        {
          NEXT_PUBLIC_APP_URL: "https://tcg-website-xi.vercel.app",
          [PRODUCTION_DEMO_SEED_OVERRIDE_ENV]: "true",
        },
      ),
    /拒絕寫入示範店賽/,
  );
  assert.equal(calls, 0);

  const created: string[] = [];
  const result = await seedMissingTournaments(
    {
      async findBySlug(slug) {
        return slug === "standard-sat-12" ? { slug } : null;
      },
      async create(row) {
        created.push(row.slug);
      },
    },
    {
      VERCEL_ENV: "production",
      APP_URL: "https://TCG-WEBSITE-XI.vercel.app/tournaments",
      [PRODUCTION_DEMO_SEED_OVERRIDE_ENV]: `  ${PRODUCTION_DEMO_SEED_OVERRIDE_VALUE}  `,
    },
  );
  assert.deepEqual(result.skipped, ["standard-sat-12"]);
  assert.deepEqual(result.created, ["beginner-friendly"]);
  assert.deepEqual(created, ["beginner-friendly"]);
});
