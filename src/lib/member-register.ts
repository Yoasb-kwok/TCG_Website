import { normalizeEmail, normalizePhone } from "@/lib/registration-input";

/** Same ceiling the account editor already uses for Pokémon ID. */
const MAX_POKEMON_ID_LENGTH = 64;

export type MemberRegistration = {
  email: string;
  password: string;
  name: string | null;
  /** 8-digit Hong Kong number, same shape as tournament signup. */
  phone: string;
  pokemonId: string;
};

export type MemberField = "email" | "password" | "phone" | "pokemonId";

export type ParsedMemberRegistration =
  | { ok: true; value: MemberRegistration }
  | {
      ok: false;
      error: string;
      status: 400;
      fields: Partial<Record<MemberField, string>>;
    };

function asString(value: unknown): { ok: true; value: string } | { ok: false } {
  if (value == null) return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false };
  return { ok: true, value };
}

/**
 * Storefront signup. Email and password keep their existing checks.
 * Phone and Pokémon ID are required and stored on the member.
 */
export function parseMemberRegistration(input: {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  phone?: unknown;
  pokemonId?: unknown;
}): ParsedMemberRegistration {
  const emailRaw = asString(input.email);
  const passwordRaw = asString(input.password);
  const nameRaw = asString(input.name);
  const phoneRaw = asString(input.phone);
  const pokemonRaw = asString(input.pokemonId);
  if (!emailRaw.ok || !passwordRaw.ok || !nameRaw.ok || !phoneRaw.ok || !pokemonRaw.ok) {
    return { ok: false, error: "資料格式不正確", status: 400, fields: {} };
  }

  const fields: Partial<Record<MemberField, string>> = {};
  const messages: string[] = [];

  const emailInput = emailRaw.value.trim();
  const password = passwordRaw.value;
  let email = "";

  if (!emailInput || !password) {
    const message = "請填寫電郵及密碼";
    if (!emailInput) fields.email = message;
    if (!password) fields.password = message;
    messages.push(message);
  } else {
    const normalized = normalizeEmail(emailInput);
    if (!normalized) {
      fields.email = "電郵格式不正確";
      messages.push(fields.email);
    } else {
      email = normalized;
    }
    if (password.length < 6) {
      fields.password = "密碼至少需要 6 個字元";
      messages.push(fields.password);
    }
  }

  const phoneInput = phoneRaw.value.trim();
  let phone = "";
  if (!phoneInput) {
    fields.phone = "請輸入電話號碼";
    messages.push(fields.phone);
  } else {
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      fields.phone = "電話號碼必須為 8 位數字";
      messages.push(fields.phone);
    } else {
      phone = normalized;
    }
  }

  const pokemonId = pokemonRaw.value.trim();
  if (!pokemonId) {
    fields.pokemonId = "請輸入 Pokémon ID";
    messages.push(fields.pokemonId);
  } else if (pokemonId.length > MAX_POKEMON_ID_LENGTH) {
    fields.pokemonId = "Pokémon ID 不可超過 64 個字元";
    messages.push(fields.pokemonId);
  } else if (/[\u0000-\u001F]/.test(pokemonId)) {
    fields.pokemonId = "Pokémon ID 格式不正確";
    messages.push(fields.pokemonId);
  }

  if (messages.length > 0) {
    return { ok: false, error: messages.join("；"), status: 400, fields };
  }

  const name = nameRaw.value.trim();
  return {
    ok: true,
    value: {
      email,
      password,
      name: name.length > 0 ? name : null,
      phone,
      pokemonId,
    },
  };
}
