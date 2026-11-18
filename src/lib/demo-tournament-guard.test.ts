import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_TOURNAMENT_SLUGS,
  PRODUCTION_DEMO_SEED_OVERRIDE_ENV,
  PRODUCTION_DEMO_SEED_OVERRIDE_VALUE,
  demoTournamentSeedRefusal,
  hostnameFromAppUrl,
  omitProductionDemoTournaments,
  storefrontDemoTournamentReasons,
} from "./demo-tournament-guard";

const liveSecret = "sk_live_super_secret_value";
const livePublishable = "pk_live_super_secret_value";

test("demo seed slugs are the weekly storefront fixtures", () => {
  assert.deepEqual(DEMO_TOURNAMENT_SLUGS, ["standard-sat-12", "beginner-friendly"]);
});

test("production seed signals are recognized without echoing secrets", () => {
  assert.deepEqual(storefrontDemoTournamentReasons({}), []);
  assert.deepEqual(
    storefrontDemoTournamentReasons({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
    }),
    [],
  );
  assert.deepEqual(storefrontDemoTournamentReasons({ VERCEL_ENV: "preview" }), []);
  assert.deepEqual(storefrontDemoTournamentReasons({ VERCEL_ENV: "production" }), ["VERCEL_ENV=production"]);

  const fromLiveUrl = storefrontDemoTournamentReasons({
    APP_URL: "https://user:password@TCG-WEBSITE-XI.vercel.app/demo",
    AUTH_URL: "https://tcg-website-xi.vercel.app",
    STRIPE_SECRET_KEY: liveSecret,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: livePublishable,
  });
  assert.equal(fromLiveUrl.includes("password"), false);
  assert.equal(fromLiveUrl.some((reason) => reason.includes(liveSecret)), false);
  assert.equal(fromLiveUrl.some((reason) => reason.includes(livePublishable)), false);
  assert.ok(fromLiveUrl.some((reason) => reason.includes("APP_URL")));
  assert.ok(fromLiveUrl.some((reason) => reason.includes("AUTH_URL")));
  assert.ok(fromLiveUrl.some((reason) => reason.includes("STRIPE_SECRET_KEY")));
  assert.ok(fromLiveUrl.some((reason) => reason.includes("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")));

  const declared = storefrontDemoTournamentReasons({
    VERCEL_PROJECT_PRODUCTION_URL: "shop.example.com",
    NEXTAUTH_URL: "https://shop.example.com",
  });
  assert.deepEqual(declared, ["NEXTAUTH_URL 指向正式網站 shop.example.com"]);

  assert.deepEqual(
    storefrontDemoTournamentReasons({
      VERCEL_PROJECT_PRODUCTION_URL: "shop.example.com",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    }),
    [],
  );
});

test("seed refusal blocks production and a remote production process, not a dev database", () => {
  assert.equal(
    demoTournamentSeedRefusal({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://user:secret@ep-dev.ap-southeast-1.aws.neon.tech/neondb",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    }),
    null,
  );
  assert.equal(
    demoTournamentSeedRefusal({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/tcg",
    }),
    null,
  );
  assert.equal(
    demoTournamentSeedRefusal({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:secret@10.1.0.8:5432/tcg",
    }),
    null,
  );

  const remote = demoTournamentSeedRefusal({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:super-secret@ep-prod.neon.tech/neondb",
  });
  assert.match(remote ?? "", /遠端主機 ep-prod.neon.tech/);
  assert.equal(remote?.includes("super-secret"), false);

  const unparsed = demoTournamentSeedRefusal({
    NODE_ENV: "production",
    DATABASE_URL: "not a url",
  });
  assert.match(unparsed ?? "", /不是可確認的本機資料庫/);
  assert.equal(unparsed?.includes("not a url"), false);

  const overridden = demoTournamentSeedRefusal({
    VERCEL_ENV: "production",
    DATABASE_URL: "postgresql://user:super-secret@ep-prod.neon.tech/neondb",
    [PRODUCTION_DEMO_SEED_OVERRIDE_ENV]: PRODUCTION_DEMO_SEED_OVERRIDE_VALUE,
  });
  assert.equal(overridden, null);

  assert.equal(hostnameFromAppUrl("tcg-website-xi.vercel.app"), "tcg-website-xi.vercel.app");
  assert.equal(hostnameFromAppUrl("http://localhost:3000"), "localhost");
  assert.equal(hostnameFromAppUrl(""), null);
});

test("the storefront filter ignores the seed override and only removes demo slugs", () => {
  const items = [
    { slug: "standard-sat-12", title: "週六標準賽 #12" },
    { slug: "beginner-friendly", title: "新手友善賽" },
    { slug: "kbay-saturday", title: "九龍灣週六賽" },
  ];
  const hidden = omitProductionDemoTournaments(items, {
    VERCEL_ENV: "production",
    [PRODUCTION_DEMO_SEED_OVERRIDE_ENV]: PRODUCTION_DEMO_SEED_OVERRIDE_VALUE,
  });
  assert.deepEqual(
    hidden.map((item) => item.slug),
    ["kbay-saturday"],
  );
  assert.equal(omitProductionDemoTournaments(items, { NODE_ENV: "test" }), items);
});
