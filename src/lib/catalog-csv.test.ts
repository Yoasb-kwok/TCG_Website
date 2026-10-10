import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PENDING_TRANSLATION_LABEL,
  mergeCatalogCard,
  parseCatalogCsv,
  templateCatalogCsv,
  toCatalogCsv,
} from "./catalog-csv";

describe("parseCatalogCsv", () => {
  it("strips a UTF-8 BOM and accepts Excel CRLF", () => {
    const csv = `\uFEFFsetCode,collectorNumber,nameZhTw\r\nM6,58/76,\r\n`;
    const parsed = parseCatalogCsv(csv);
    assert.equal(parsed.sets.length, 1);
    const card = parsed.sets[0].cards[0];
    assert.equal(parsed.sets[0].code, "M6");
    assert.equal(card.collectorNumber, "058/076");
    assert.equal(card.nameZhTw, PENDING_TRANSLATION_LABEL);
    assert.equal(card.pendingTranslation, true);
    assert.ok(card.missingFields.split(",").includes("nameZhTw"));
  });

  it("keeps arbitrary set codes such as M6a and reads official-style headers", () => {
    const csv = [
      "系列編號,收集編號,卡牌名稱,日文名稱,稀有度",
      "M6a,113/076,超級烈空坐ex,メガレックウザex,MUR",
    ].join("\n");
    const parsed = parseCatalogCsv(csv);
    assert.equal(parsed.sets[0].code, "M6a");
    const card = parsed.sets[0].cards[0];
    assert.equal(card.collectorNumber, "113/076");
    assert.equal(card.nameZhTw, "超級烈空坐ex");
    assert.equal(card.nameJa, "メガレックウザex");
    assert.equal(card.rarity, "MUR");
    assert.equal(card.pendingTranslation, false);
    assert.equal(card.missingFields, "imageUrl");
  });

  it("splits a two-sided official collector number into the primary and alternate", () => {
    const csv = "setCode,collectorNumber,nameZhTw\nM6,\"071/076 , 072/076\",傳說的海溝\n";
    const card = parseCatalogCsv(csv).sets[0].cards[0];
    assert.equal(card.collectorNumber, "071/076");
    assert.equal(card.altCollectorNumber, "072/076");
    assert.equal(card.nameZhTw, "傳說的海溝");
  });

  it("treats a kana-only name column as Japanese and marks zh-tw pending", () => {
    const csv = "setCode,collectorNumber,name\nM6,001/076,ヘラクロス\n";
    const card = parseCatalogCsv(csv).sets[0].cards[0];
    assert.equal(card.nameJa, "ヘラクロス");
    assert.equal(card.nameZhTw, PENDING_TRANSLATION_LABEL);
    assert.equal(card.pendingTranslation, true);
  });

  it("parses quoted commas and uses a form set code when the column is empty", () => {
    const csv = 'collectorNumber,nameZhTw,nameJa\n"001/076","赫拉,克羅斯","ヘラクロス"\n';
    const parsed = parseCatalogCsv(csv, { setCode: "M6" });
    const card = parsed.sets[0].cards[0];
    assert.equal(parsed.sets[0].code, "M6");
    assert.equal(card.nameZhTw, "赫拉,克羅斯");
    assert.equal(card.nameJa, "ヘラクロス");
  });

  it("round-trips the template, including a blank zh-tw name", () => {
    const parsed = parseCatalogCsv(templateCatalogCsv());
    assert.deepEqual(
      parsed.sets.map((set) => set.code),
      ["M6", "NEWSET"],
    );
    const pending = parsed.sets.find((set) => set.code === "NEWSET")?.cards[0];
    assert.equal(pending?.nameZhTw, PENDING_TRANSLATION_LABEL);
    assert.equal(pending?.nameJa, "サンプル");
    assert.equal(parsed.sets[0].nameZhTw, "綠寶石風暴");
    assert.equal(parsed.sets[0].releaseDate?.toISOString().slice(0, 10), "2026-08-07");
  });

  it("warns and keeps the later row when a collector number repeats", () => {
    const csv = toCatalogCsv([
      { setCode: "M6", collectorNumber: "001/076", nameZhTw: "舊名", nameJa: "", nameEn: "", setNameZhTw: "", setNameJa: "", setNameEn: "", releaseDate: "", regulationMark: "", officialUrl: "", altCollectorNumber: "", rarity: "", illustrator: "", imageUrl: "", imageUrlJa: "" },
      { setCode: "M6", collectorNumber: "001/076", nameZhTw: "新名", nameJa: "", nameEn: "", setNameZhTw: "", setNameJa: "", setNameEn: "", releaseDate: "", regulationMark: "", officialUrl: "", altCollectorNumber: "", rarity: "C", illustrator: "", imageUrl: "", imageUrlJa: "" },
    ]);
    const parsed = parseCatalogCsv(csv);
    assert.equal(parsed.warnings.length, 1);
    assert.equal(parsed.sets[0].cards.length, 1);
    assert.equal(parsed.sets[0].cards[0].nameZhTw, "新名");
    assert.equal(parsed.sets[0].cards[0].rarity, "C");
  });
});

describe("mergeCatalogCard", () => {
  it("does not wipe an existing translation with 待補", () => {
    const existing = parseCatalogCsv(
      "setCode,collectorNumber,nameZhTw,nameJa,rarity,imageUrl\nM6,001/076,赫拉克羅斯,ヘラクロス,C,https://example.test/hk.png\n",
    ).sets[0].cards[0];
    const incoming = parseCatalogCsv(
      "setCode,collectorNumber,nameJa\nM6,001/076,ヘラクロス\n",
    ).sets[0].cards[0];
    const merged = mergeCatalogCard(existing, incoming);
    assert.equal(merged.nameZhTw, "赫拉克羅斯");
    assert.equal(merged.pendingTranslation, false);
    assert.equal(merged.rarity, "C");
    assert.equal(merged.imageUrl, "https://example.test/hk.png");
  });
});
