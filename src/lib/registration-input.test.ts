import assert from "node:assert/strict";
import test from "node:test";
import {
  parseRegistrationInput,
  registrationClosedLabel,
  registrationConflict,
} from "./registration-input";

test("parseRegistrationInput accepts name, email, and an 8-digit Hong Kong phone", () => {
  const parsed = parseRegistrationInput({
    playerName: " 陳大文 ",
    email: "Player@Example.com",
    phone: "+852 9123-4567",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.value, {
    playerName: "陳大文",
    email: "player@example.com",
    phone: "91234567",
  });
});

function rejection(input: {
  playerName?: string;
  email?: string;
  phone?: string;
}): string {
  const parsed = parseRegistrationInput(input);
  assert.equal(parsed.ok, false);
  if (parsed.ok) return "";
  return parsed.error;
}

test("parseRegistrationInput rejects missing and invalid fields", () => {
  assert.equal(rejection({ email: "a@b.co", phone: "91234567" }), "請輸入姓名");
  assert.equal(rejection({ playerName: "陳", email: "", phone: "91234567" }), "請輸入電郵");
  assert.equal(
    rejection({ playerName: "陳", email: "not-an-email", phone: "91234567" }),
    "電郵格式不正確",
  );
  assert.equal(rejection({ playerName: "陳", email: "a@b.co", phone: "" }), "請輸入電話號碼");
  assert.equal(
    rejection({ playerName: "陳", email: "a@b.co", phone: "1234567" }),
    "電話號碼必須為 8 位數字",
  );
  assert.equal(
    rejection({ playerName: "陳".repeat(41), email: "a@b.co", phone: "91234567" }),
    "姓名不可超過 40 字",
  );
});

test("registrationConflict checks capacity, email, and phone", () => {
  const existing = [{ email: "Ada@Example.com", phone: "91234567" }];
  assert.equal(
    registrationConflict(existing, { email: "ada@example.com", phone: "60000000" }, 8)?.error,
    "此電郵已報名此賽事",
  );
  assert.equal(
    registrationConflict(existing, { email: "new@example.com", phone: "91234567" }, 8)?.error,
    "此電話號碼已報名此賽事",
  );
  assert.equal(
    registrationConflict(existing, { email: "new@example.com", phone: "60000000" }, 1)?.error,
    "名額已滿",
  );
  assert.equal(
    registrationConflict([{ email: null, phone: "60000000" }], { email: "new@example.com", phone: "91111111" }, 8),
    null,
  );
});

test("registrationClosedLabel distinguishes full, finished, and deadline", () => {
  const base = {
    status: "OPEN",
    registrationDeadline: "2026-10-16T15:59:00.000Z",
    registeredCount: 1,
    maxPlayers: 8,
  };
  const now = new Date("2026-10-12T00:00:00.000Z");
  assert.equal(registrationClosedLabel(base, now), null);
  assert.equal(registrationClosedLabel({ ...base, status: "CANCELLED" }, now), "賽事已取消");
  assert.equal(registrationClosedLabel({ ...base, status: "COMPLETED" }, now), "賽事已結束");
  assert.equal(registrationClosedLabel({ ...base, status: "FULL" }, now), "名額已滿");
  assert.equal(registrationClosedLabel({ ...base, registeredCount: 8 }, now), "名額已滿");
  assert.equal(
    registrationClosedLabel(base, new Date("2026-10-17T00:00:00.000Z")),
    "報名已截止",
  );
});
