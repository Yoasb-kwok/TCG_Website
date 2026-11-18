import assert from "node:assert/strict";
import test from "node:test";
import {
  ABOUT_CONTACT_BODY,
  LEGACY_ABOUT_CONTACT_BODY,
  resolveAboutContactBody,
} from "./about-contact";
import { STORE } from "./constants";
import {
  LEGAL_EMAIL_PLACEHOLDER,
  LEGAL_PAGES,
  LEGAL_PHONE_PLACEHOLDER,
  SALE_PAYMENT_CLAUSE,
  STORE_PICKUP_ADDRESS,
  getLegalPage,
  legalPlainText,
} from "./legal-pages";

const text = legalPlainText();

test("publishes five distinct policy routes", () => {
  assert.deepEqual(
    LEGAL_PAGES.map((page) => page.href),
    ["/privacy", "/terms", "/sale", "/shipping", "/membership"],
  );
  assert.equal(new Set(LEGAL_PAGES.map((page) => page.href)).size, 5);
  assert.equal(getLegalPage("shipping").title, "退換貨、售後免責及送貨政策");
});

test("keeps the client contact placeholders and does not invent a rate", () => {
  assert.equal(LEGAL_EMAIL_PLACEHOLDER, "[請填入客服電郵]");
  assert.equal(LEGAL_PHONE_PLACEHOLDER, "[請填入電話]");
  assert.equal(text.split(LEGAL_EMAIL_PLACEHOLDER).length - 1, 1);
  assert.equal(text.split(LEGAL_PHONE_PLACEHOLDER).length - 1, 1);
  assert.equal(text.includes("【"), false);
  assert.equal(text.includes("】"), false);
  assert.equal(text.includes("@"), false);
  assert.equal(/折扣率|會員折扣|滿額\s*HK\$|HK\$\s*500/.test(text), false);
});

test("keeps the confirmed windows, address, and section 5.4 wording", () => {
  assert.equal(STORE_PICKUP_ADDRESS, "九龍灣工業中心7樓28室");
  assert.equal(STORE.address.zh, STORE_PICKUP_ADDRESS);
  assert.match(text, /14 天內繳清尾數/);
  assert.match(text, /逾期超過 30 天/);
  assert.match(text, /1–3 個工作天/);
  assert.match(text, /簽收後 24 小時內/);
  assert.match(text, /落單後 24 小時內/);
  assert.match(text, /開賽前 12 小時/);
  assert.match(text, /未來 15 天/);
  assert.match(text, /每消費滿 HKD \$1/);
  assert.match(text, /每年 12 月 31 日統一清零/);
  assert.match(text, /預設採用 順豐速運到付 \/ 滿指定金額包郵/);
  assert.match(text, /FPS 轉數快 \/ 銀行轉帳/);
  assert.match(text, /騷擾其他玩家/);
  assert.equal(text.includes("驚擾"), false);
  assert.equal(getLegalPage("sale").sections[1]?.blocks[0]?.text, SALE_PAYMENT_CLAUSE);
});

test("replaces only the retired about-page handling window", () => {
  assert.equal(resolveAboutContactBody(LEGACY_ABOUT_CONTACT_BODY), ABOUT_CONTACT_BODY);
  assert.equal(resolveAboutContactBody("  "), ABOUT_CONTACT_BODY);
  assert.equal(resolveAboutContactBody("自訂聯絡文字"), "自訂聯絡文字");
  assert.equal(ABOUT_CONTACT_BODY.includes("1–2 個工作天"), false);
});
