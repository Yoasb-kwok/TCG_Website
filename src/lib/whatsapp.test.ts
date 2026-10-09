import assert from "node:assert/strict";
import test from "node:test";
import { resolveWhatsAppHref, whatsappHrefFromInput } from "./whatsapp";

test("Hong Kong shop numbers become wa.me links with country code", () => {
  assert.equal(whatsappHrefFromInput("66094893"), "https://wa.me/85266094893");
  assert.equal(whatsappHrefFromInput("85266094893"), "https://wa.me/85266094893");
  assert.equal(whatsappHrefFromInput("https://wa.me/85266094893"), "https://wa.me/85266094893");
  assert.equal(whatsappHrefFromInput(""), null);
  assert.equal(whatsappHrefFromInput("https://wa.me/"), null);
});

test("site config supplies a number when env is empty", () => {
  assert.equal(resolveWhatsAppHref(undefined), "https://wa.me/85266094893");
  assert.equal(resolveWhatsAppHref("91234567"), "https://wa.me/85291234567");
});
