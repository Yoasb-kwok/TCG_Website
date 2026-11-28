import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_HOME_SERVICES, parseHomeServiceEdits, resolveHomeServices } from "./home-services";

test("missing rows keep the existing titles, copy, and Pokémon images", () => {
  const services = resolveHomeServices([]);
  assert.deepEqual(services, DEFAULT_HOME_SERVICES.map((service) => ({ ...service })));
});

test("a saved title is kept and a blank image falls back to the Pokémon default", () => {
  const services = resolveHomeServices([
    { id: "singles", title: "單卡專區", body: "", imageUrl: "", href: "" },
  ]);
  assert.equal(services[0]?.title, "單卡專區");
  assert.equal(services[0]?.body, DEFAULT_HOME_SERVICES[0]?.body);
  assert.equal(services[0]?.imageUrl, DEFAULT_HOME_SERVICES[0]?.imageUrl);
  assert.equal(services[1]?.title, "封盒預訂");
});

test("service edits must stay on the three known cards and an internal link", () => {
  const invalid = parseHomeServiceEdits([
    { id: "singles", title: "單卡", body: "內文", href: "https://example.com", imageUrl: "" },
  ]);
  assert.equal(invalid.ok, false);

  const valid = parseHomeServiceEdits(
    DEFAULT_HOME_SERVICES.map((service) => ({ ...service, imageUrl: "/uploads/services/a.png" })),
  );
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.services[0]?.imageUrl, "/uploads/services/a.png");
});
