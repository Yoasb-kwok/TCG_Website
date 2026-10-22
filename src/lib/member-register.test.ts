import assert from "node:assert/strict";
import test from "node:test";
import { parseMemberRegistration } from "./member-register";

const base = {
  email: "Player@Example.com",
  password: "secret1",
  name: " 陳大文 ",
  phone: "+852 9123-4567",
  pokemonId: " 1234-5678 ",
};

test("parseMemberRegistration accepts phone and Pokémon ID with the existing email and password", () => {
  const parsed = parseMemberRegistration(base);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.value, {
    email: "player@example.com",
    password: "secret1",
    name: "陳大文",
    phone: "91234567",
    pokemonId: "1234-5678",
  });
});

test("parseMemberRegistration treats a blank name as omitted", () => {
  const parsed = parseMemberRegistration({ ...base, name: "   " });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.name, null);
});

test("parseMemberRegistration rejects a signup that omits phone, Pokémon ID, or both", () => {
  const missingPhone = parseMemberRegistration({ ...base, phone: "  " });
  assert.equal(missingPhone.ok, false);
  if (!missingPhone.ok) {
    assert.equal(missingPhone.error, "請輸入電話號碼");
    assert.equal(missingPhone.fields.phone, "請輸入電話號碼");
  }

  const missingId = parseMemberRegistration({ ...base, pokemonId: "" });
  assert.equal(missingId.ok, false);
  if (!missingId.ok) {
    assert.equal(missingId.error, "請輸入 Pokémon ID");
    assert.equal(missingId.fields.pokemonId, "請輸入 Pokémon ID");
  }

  const missingBoth = parseMemberRegistration({ ...base, phone: "", pokemonId: undefined });
  assert.equal(missingBoth.ok, false);
  if (!missingBoth.ok) {
    assert.equal(missingBoth.error, "請輸入電話號碼；請輸入 Pokémon ID");
    assert.equal(missingBoth.fields.phone, "請輸入電話號碼");
    assert.equal(missingBoth.fields.pokemonId, "請輸入 Pokémon ID");
  }
});

test("parseMemberRegistration rejects a phone that is not 8 Hong Kong digits", () => {
  const parsed = parseMemberRegistration({ ...base, phone: "1234567" });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.error, "電話號碼必須為 8 位數字");
});

test("parseMemberRegistration rejects an empty, oversized, or control-character Pokémon ID", () => {
  const longId = parseMemberRegistration({ ...base, pokemonId: "1".repeat(65) });
  assert.equal(longId.ok, false);
  if (!longId.ok) assert.equal(longId.error, "Pokémon ID 不可超過 64 個字元");

  const control = parseMemberRegistration({ ...base, pokemonId: "1234\n5678" });
  assert.equal(control.ok, false);
  if (!control.ok) assert.equal(control.error, "Pokémon ID 格式不正確");
});

test("parseMemberRegistration still checks email and password before the new fields", () => {
  const missing = parseMemberRegistration({ ...base, email: "", password: "" });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error.startsWith("請填寫電郵及密碼"), true);

  const badEmail = parseMemberRegistration({ ...base, email: "not-an-email" });
  assert.equal(badEmail.ok, false);
  if (!badEmail.ok) assert.equal(badEmail.fields.email, "電郵格式不正確");

  const shortPassword = parseMemberRegistration({ ...base, password: "12345" });
  assert.equal(shortPassword.ok, false);
  if (!shortPassword.ok) assert.equal(shortPassword.fields.password, "密碼至少需要 6 個字元");
});

test("parseMemberRegistration rejects a non-string phone or Pokémon ID", () => {
  const parsed = parseMemberRegistration({ ...base, pokemonId: 12345678 });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.error, "資料格式不正確");
});
