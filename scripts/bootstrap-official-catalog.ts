/**
 * One-off CSV builder. It reads the official Asia HK card search
 * (and, optionally, the Japanese official card search) and writes a CSV.
 * It does not write the database. Import the file from /admin/catalog.
 *
 *   npx tsx scripts/bootstrap-official-catalog.ts --code M6 --jp-pg 955 --release 2026-08-07 --out prisma/catalog/samples/m6.csv
 */
import fs from "node:fs";
import path from "node:path";
import { toCatalogCsv } from "../src/lib/catalog-csv";

const UA = "TCG-Website catalog bootstrap (ops CSV only; not a runtime source)";
const HK = "https://asia.pokemon-card.com";
const JP = "https://www.pokemon-card.com";

interface HkCard {
  numbers: string[];
  collectorNumber: string;
  nameZhTw: string;
  imageUrl: string;
  illustrator: string;
  regulationMark: string;
}

interface JpCard {
  collectorNumber: string;
  nameJa: string;
  imageUrlJa: string;
  rarity: string;
  illustrator: string;
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchText(url: string): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return await response.text();
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error(`無法讀取 ${url}`);
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

function padNumber(raw: string): string {
  const match = raw.replace(/\s+/g, "").match(/^(\d+)\/(\d+)$/);
  if (!match) return raw.trim();
  const width = Math.max(3, match[1].length, match[2].length);
  return `${match[1].padStart(width, "0")}/${match[2].padStart(width, "0")}`;
}

function printedNumbers(raw: string): string[] {
  const found = [...raw.matchAll(/(\d+)\s*\/\s*(\d+)/g)].map((match) => {
    const width = Math.max(3, match[1].length, match[2].length);
    return `${match[1].padStart(width, "0")}/${match[2].padStart(width, "0")}`;
  });
  return [...new Set(found)];
}

function rarityFromFile(file: string): string {
  const base = file.toLowerCase().split("/").pop() ?? file;
  return base.replace(/\.gif$/, "").replace(/^ic_rare_/, "").replace(/_c$/, "").toUpperCase();
}

function bracketName(label: string): string {
  const match = label.match(/「([^」]+)」/);
  return (match?.[1] ?? label).trim();
}

async function hkSetName(code: string): Promise<string> {
  const html = await fetchText(`${HK}/hk/card-search/`);
  const match = html.match(
    new RegExp(`value="${escapeRegExp(code)}"[\\s\\S]{0,400}?<label[^>]*>([^<]+)</label>`),
  );
  return match ? bracketName(match[1]) : "";
}

async function listHkIds(code: string): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 30; page++) {
    const html = await fetchText(
      `${HK}/hk/card-search/list/?pageNo=${page}&expansionCodes=${encodeURIComponent(code)}`,
    );
    const found = [...html.matchAll(/\/hk\/card-search\/detail\/(\d+)\//g)].map((item) => item[1]);
    if (found.length === 0) break;
    let added = 0;
    for (const id of found) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      added += 1;
    }
    if (added === 0 || !html.includes(`pageNo=${page + 1}`)) break;
  }
  return ids;
}

async function readHkCard(id: string): Promise<HkCard> {
  const html = await fetchText(`${HK}/hk/card-search/detail/${id}/`);
  const heading = html.match(/<h1 class="pageHeader cardDetail">([\s\S]*?)<\/h1>/);
  const name = heading
    ? heading[1]
        .replace(/<span class="evolveMarker">[\s\S]*?<\/span>/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
  const number = html.match(/class="collectorNumber">\s*([^<]+?)\s*</);
  const numbers = printedNumbers(number?.[1] ?? "");
  const image = html.match(/class="cardImage">\s*<img src="([^"]+)"/);
  const illustrator = html.match(/class="illustrator"[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
  const alpha = html.match(/class="alpha">\s*([^<]+?)\s*</);
  return {
    numbers,
    collectorNumber: numbers[0] ?? "",
    nameZhTw: name,
    imageUrl: image?.[1] ?? "",
    illustrator: illustrator?.[1].trim() ?? "",
    regulationMark: alpha?.[1].trim() ?? "",
  };
}

async function resolveJpPg(pg: string | undefined, name: string | undefined): Promise<string | undefined> {
  if (pg) return pg;
  if (!name) return undefined;
  const html = await fetchText(`${JP}/card-search/`);
  const pattern = /name:\s*"pg",\s*value:\s*"(\d+)",[\s\S]*?label:\s*"([^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    if (match[2].includes(name)) return match[1];
  }
  throw new Error(`日本官方卡牌搜尋找不到商品「${name}」`);
}

async function listJp(pg: string): Promise<{ cards: Array<{ cardID: string; cardNameViewText?: string; cardThumbFile?: string }>; setName: string }> {
  const cards: Array<{ cardID: string; cardNameViewText?: string; cardThumbFile?: string }> = [];
  let setName = "";
  for (let page = 1; page <= 20; page++) {
    const url = new URL(`${JP}/card-search/resultAPI.php`);
    url.searchParams.set("keyword", "");
    url.searchParams.set("se_ta", "");
    url.searchParams.set("regulation_sidebar_form", "all");
    url.searchParams.set("pg", pg);
    url.searchParams.set("illust", "");
    url.searchParams.set("sm_and_keyword", "true");
    url.searchParams.set("page", String(page));
    const payload = JSON.parse(await fetchText(url.toString())) as {
      maxPage?: number;
      cardList?: Array<{ cardID: string; cardNameViewText?: string; cardThumbFile?: string }>;
      searchCondition?: string[];
    };
    if (!setName) {
      const label = (payload.searchCondition ?? []).find((item) => item.includes("「"));
      setName = label ? bracketName(label) : "";
    }
    const list = payload.cardList ?? [];
    cards.push(...list);
    if (list.length === 0 || page >= (payload.maxPage ?? 1)) break;
  }
  return { cards, setName };
}

async function readJpCard(card: { cardID: string; cardNameViewText?: string; cardThumbFile?: string }): Promise<JpCard> {
  const html = await fetchText(`${JP}/card-search/details.php/card/${card.cardID}/regu/all`);
  const number = html.match(/&nbsp;(\d+)&nbsp;\/&nbsp;(\d+)&nbsp;/);
  const rarity = html.match(/\/assets\/images\/card\/rarity\/([^"']+)/);
  const illustrator = html.match(/class="author"[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
  const image = card.cardThumbFile ?? "";
  return {
    collectorNumber: number ? padNumber(`${number[1]}/${number[2]}`) : "",
    nameJa: card.cardNameViewText ?? "",
    imageUrlJa: image.startsWith("/") ? `${JP}${image}` : image,
    rarity: rarity ? rarityFromFile(rarity[1]) : "",
    illustrator: illustrator?.[1].trim() ?? "",
  };
}

async function main() {
  const code = arg("code");
  if (!code) {
    throw new Error("請指定 --code，例如 --code M6 或 --code M6a");
  }

  const releaseDate = arg("release") ?? "";
  const nameEn = arg("name-en") ?? "";
  const out = arg("out");
  const jpPg = await resolveJpPg(arg("jp-pg"), arg("jp-name"));

  process.stderr.write(`讀取香港官方卡表 ${code}…\n`);
  const [setNameZhTw, ids] = await Promise.all([hkSetName(code), listHkIds(code)]);
  if (ids.length === 0) {
    throw new Error(`香港官方卡牌搜尋沒有系列 ${code}`);
  }
  const hkCards = await mapPool(ids, 6, readHkCard);
  process.stderr.write(`香港官方 ${hkCards.length} 張\n`);

  const jpByNumber = new Map<string, JpCard>();
  let setNameJa = arg("name-ja") ?? "";
  if (jpPg) {
    process.stderr.write(`讀取日本官方商品 pg=${jpPg}…\n`);
    const listed = await listJp(jpPg);
    if (!setNameJa) setNameJa = listed.setName;
    const jpCards = await mapPool(listed.cards, 6, readJpCard);
    for (const card of jpCards) {
      if (card.collectorNumber) jpByNumber.set(card.collectorNumber, card);
    }
    process.stderr.write(`日本官方 ${jpByNumber.size} 張\n`);
  }

  const hkByNumber = new Map(hkCards.filter((card) => card.collectorNumber).map((card) => [card.collectorNumber, card]));
  const paired = new Map<string, JpCard>();
  for (const card of hkByNumber.values()) {
    const match = card.numbers.map((number) => jpByNumber.get(number)).find((jp) => jp);
    if (match) paired.set(card.collectorNumber, match);
  }
  const leftoverHk = [...hkByNumber.keys()].filter((number) => !paired.has(number)).sort();
  const usedJp = new Set([...paired.values()].map((card) => card.collectorNumber));
  const leftoverJp = [...jpByNumber.keys()].filter((number) => !usedJp.has(number)).sort();
  if (leftoverHk.length > 0 && leftoverHk.length === leftoverJp.length) {
    leftoverHk.forEach((number, index) => {
      const jp = jpByNumber.get(leftoverJp[index]);
      if (jp) paired.set(number, jp);
    });
    process.stderr.write(`仍有 ${leftoverHk.length} 張改以編號順序配對日文名\n`);
  } else if (leftoverHk.length > 0 || leftoverJp.length > 0) {
    process.stderr.write(
      `未配對：香港 ${leftoverHk.join(" ") || "無"}；日本 ${leftoverJp.join(" ") || "無"}\n`,
    );
  }

  const regulationMark =
    hkCards.map((card) => card.regulationMark).find((mark) => mark) ?? "";
  const officialUrl = `${HK}/hk/card-search/list/?expansionCodes=${encodeURIComponent(code)}`;
  const rows = [...hkByNumber.values()]
    .sort((a, b) => a.collectorNumber.localeCompare(b.collectorNumber))
    .map((card) => {
      const jp = paired.get(card.collectorNumber);
      const extras = card.numbers.filter((number) => number !== card.collectorNumber);
      if (jp && jp.collectorNumber !== card.collectorNumber && !extras.includes(jp.collectorNumber)) {
        extras.push(jp.collectorNumber);
      }
      const alt = extras.join(",");
      return {
        setCode: code,
        setNameZhTw,
        setNameJa,
        setNameEn: nameEn,
        releaseDate,
        regulationMark: card.regulationMark || regulationMark,
        officialUrl,
        collectorNumber: card.collectorNumber,
        altCollectorNumber: alt,
        nameZhTw: card.nameZhTw,
        nameJa: jp?.nameJa ?? "",
        nameEn: "",
        rarity: jp?.rarity ?? "",
        illustrator: card.illustrator || jp?.illustrator || "",
        imageUrl: card.imageUrl,
        imageUrlJa: jp?.imageUrlJa ?? "",
      };
    });

  const csv = toCatalogCsv(rows);
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, csv);
    process.stderr.write(`寫入 ${out}（${rows.length} 列）\n`);
  } else {
    process.stdout.write(csv);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
