/** 缺繁中譯名時寫進卡表的佔位字。 */
export const PENDING_TRANSLATION_LABEL = "待補";

export const CATALOG_CSV_HEADERS = [
  "setCode",
  "setNameZhTw",
  "setNameJa",
  "setNameEn",
  "releaseDate",
  "regulationMark",
  "officialUrl",
  "collectorNumber",
  "altCollectorNumber",
  "nameZhTw",
  "nameJa",
  "nameEn",
  "rarity",
  "illustrator",
  "imageUrl",
  "imageUrlJa",
] as const;

export type CatalogCsvHeader = (typeof CATALOG_CSV_HEADERS)[number];

const MISSING_FIELD_ORDER = ["nameZhTw", "nameJa", "imageUrl", "rarity"] as const;

export class CatalogImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogImportError";
  }
}

export interface CatalogCardDraft {
  collectorNumber: string;
  altCollectorNumber: string | null;
  sortIndex: number;
  nameZhTw: string;
  nameJa: string | null;
  nameEn: string | null;
  imageUrl: string | null;
  imageUrlJa: string | null;
  rarity: string | null;
  illustrator: string | null;
  regulationMark: string | null;
  pendingTranslation: boolean;
  missingFields: string;
}

export interface CatalogSetDraft {
  code: string;
  nameZhTw: string | null;
  nameJa: string | null;
  nameEn: string | null;
  releaseDate: Date | null;
  regulationMark: string | null;
  officialUrl: string | null;
  cards: CatalogCardDraft[];
}

export interface ParsedCatalogCsv {
  sets: CatalogSetDraft[];
  warnings: string[];
}

type Column =
  | CatalogCsvHeader
  | "name";

const HEADER_ALIASES: Record<string, Column> = {
  setcode: "setCode",
  code: "setCode",
  expansioncode: "setCode",
  系列: "setCode",
  系列編號: "setCode",
  系列编号: "setCode",
  商品代碼: "setCode",
  商品代码: "setCode",
  setnamezhtw: "setNameZhTw",
  系列名稱: "setNameZhTw",
  系列名称: "setNameZhTw",
  商品名稱: "setNameZhTw",
  setnameja: "setNameJa",
  系列日文: "setNameJa",
  setnameen: "setNameEn",
  releasedate: "releaseDate",
  發售日: "releaseDate",
  发售日: "releaseDate",
  発売日: "releaseDate",
  regulationmark: "regulationMark",
  賽制標記: "regulationMark",
  officialurl: "officialUrl",
  官方連結: "officialUrl",
  collectornumber: "collectorNumber",
  cardnumber: "collectorNumber",
  number: "collectorNumber",
  no: "collectorNumber",
  卡號: "collectorNumber",
  卡号: "collectorNumber",
  收集編號: "collectorNumber",
  收集编号: "collectorNumber",
  コレクション番号: "collectorNumber",
  altcollectornumber: "altCollectorNumber",
  jpcollectornumber: "altCollectorNumber",
  日本卡號: "altCollectorNumber",
  namezhtw: "nameZhTw",
  卡牌名稱: "nameZhTw",
  卡牌名称: "nameZhTw",
  繁中名稱: "nameZhTw",
  中文名稱: "nameZhTw",
  nameja: "nameJa",
  日文名稱: "nameJa",
  日文名称: "nameJa",
  カード名: "nameJa",
  nameen: "nameEn",
  英文名稱: "nameEn",
  name: "name",
  名稱: "name",
  名称: "name",
  rarity: "rarity",
  稀有度: "rarity",
  レアリティ: "rarity",
  illustrator: "illustrator",
  繪師: "illustrator",
  绘师: "illustrator",
  イラストレーター: "illustrator",
  imageurl: "imageUrl",
  圖片: "imageUrl",
  图片: "imageUrl",
  imageurlja: "imageUrlJa",
  日文圖片: "imageUrlJa",
};

const SET_CODE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

export function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** RFC 4180 CSV, including Excel's UTF-8 BOM and CRLF. */
export function parseCsvTable(text: string): string[][] {
  const src = stripUtf8Bom(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function toCatalogCsv(rows: Record<string, string>[]): string {
  const lines = [CATALOG_CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(CATALOG_CSV_HEADERS.map((header) => csvEscape(row[header] ?? "")).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function templateCatalogCsv(): string {
  return toCatalogCsv([
    {
      setCode: "M6",
      setNameZhTw: "綠寶石風暴",
      setNameJa: "ストームエメラルダ",
      setNameEn: "",
      releaseDate: "2026-08-07",
      regulationMark: "J",
      officialUrl: "https://asia.pokemon-card.com/hk/card-search/list/?expansionCodes=M6",
      collectorNumber: "001/076",
      altCollectorNumber: "",
      nameZhTw: "赫拉克羅斯",
      nameJa: "ヘラクロス",
      nameEn: "",
      rarity: "C",
      illustrator: "Satoshi Ito",
      imageUrl: "https://asia.pokemon-card.com/hk/card-img/hk00019270.png",
      imageUrlJa:
        "https://www.pokemon-card.com/assets/images/card_images/large/M6/050339_P_HERAKUROSU.jpg",
    },
    {
      setCode: "NEWSET",
      setNameZhTw: "新系列",
      setNameJa: "",
      setNameEn: "",
      releaseDate: "2026-10-01",
      regulationMark: "",
      officialUrl: "",
      collectorNumber: "002/080",
      altCollectorNumber: "",
      nameZhTw: "",
      nameJa: "サンプル",
      nameEn: "",
      rarity: "U",
      illustrator: "",
      imageUrl: "",
      imageUrlJa: "",
    },
  ]);
}

export function normalizeCollectorNumber(raw: string): string {
  const compact = raw
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .replaceAll("／", "/")
    .replaceAll("\\", "/");
  const match = compact.match(/^0*(\d+)\/0*(\d+)$/);
  if (!match) return compact;
  const width = Math.max(3, match[1].length, match[2].length);
  return `${match[1].padStart(width, "0")}/${match[2].padStart(width, "0")}`;
}

/** Official pages sometimes print both halves, e.g. "071/076 , 072/076". */
export function splitPrintedNumbers(raw: string): string[] {
  const found = [...raw.matchAll(/(\d+)\s*[/／]\s*(\d+)/g)].map((match) => {
    const width = Math.max(3, match[1].length, match[2].length);
    return `${match[1].padStart(width, "0")}/${match[2].padStart(width, "0")}`;
  });
  if (found.length > 0) return [...new Set(found)];
  const single = normalizeCollectorNumber(raw);
  return single ? [single] : [];
}

export function collectorSortIndex(collectorNumber: string): number {
  const match = collectorNumber.match(/^(\d+)/);
  // Energy codes such as GRA have no index. Keep them after the numbered list.
  return match ? Number.parseInt(match[1], 10) : 100_000;
}

export function splitMissingFields(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function blankToNull(value: string | null | undefined): string | null {
  const next = value?.trim() ?? "";
  return next ? next : null;
}

function hasKana(value: string): boolean {
  return /[\u3040-\u30ff\uff66-\uff9d]/.test(value);
}

function canonicalHeader(raw: string): Column | null {
  const trimmed = raw.trim().replace(/^\uFEFF/, "");
  if (HEADER_ALIASES[trimmed]) return HEADER_ALIASES[trimmed];
  const compact = trimmed.toLowerCase().replace(/[\s_\-.]/g, "");
  return HEADER_ALIASES[compact] ?? null;
}

function parseReleaseDate(raw: string, rowNumber: number): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) {
    throw new CatalogImportError(`第 ${rowNumber} 列的發售日必須是 YYYY-MM-DD`);
  }
  const iso = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new CatalogImportError(`第 ${rowNumber} 列的發售日無效`);
  }
  return date;
}

export function catalogMissingFields(card: {
  nameZhTw: string | null;
  nameJa: string | null;
  imageUrl: string | null;
  rarity: string | null;
}): string {
  const present: Record<(typeof MISSING_FIELD_ORDER)[number], boolean> = {
    nameZhTw: Boolean(card.nameZhTw && card.nameZhTw !== PENDING_TRANSLATION_LABEL),
    nameJa: Boolean(card.nameJa),
    imageUrl: Boolean(card.imageUrl),
    rarity: Boolean(card.rarity),
  };
  return MISSING_FIELD_ORDER.filter((field) => !present[field]).join(",");
}

export function finalizeCatalogCard(input: {
  collectorNumber: string;
  altCollectorNumber?: string | null;
  nameZhTw?: string | null;
  nameJa?: string | null;
  nameEn?: string | null;
  imageUrl?: string | null;
  imageUrlJa?: string | null;
  rarity?: string | null;
  illustrator?: string | null;
  regulationMark?: string | null;
}): CatalogCardDraft {
  const collectorNumber = normalizeCollectorNumber(input.collectorNumber);
  const altRaw = blankToNull(input.altCollectorNumber);
  const altCollectorNumber = altRaw ? normalizeCollectorNumber(altRaw) : null;
  const nameJa = blankToNull(input.nameJa);
  const nameEn = blankToNull(input.nameEn);
  const providedZh = blankToNull(input.nameZhTw);
  const nameZhTw =
    !providedZh || providedZh === PENDING_TRANSLATION_LABEL
      ? PENDING_TRANSLATION_LABEL
      : providedZh;
  const imageUrl = blankToNull(input.imageUrl);
  const rarity = blankToNull(input.rarity);
  const pendingTranslation = nameZhTw === PENDING_TRANSLATION_LABEL;

  return {
    collectorNumber,
    altCollectorNumber:
      altCollectorNumber && altCollectorNumber !== collectorNumber ? altCollectorNumber : null,
    sortIndex: collectorSortIndex(collectorNumber),
    nameZhTw,
    nameJa,
    nameEn,
    imageUrl,
    imageUrlJa: blankToNull(input.imageUrlJa),
    rarity,
    illustrator: blankToNull(input.illustrator),
    regulationMark: blankToNull(input.regulationMark),
    pendingTranslation,
    missingFields: catalogMissingFields({
      nameZhTw,
      nameJa,
      imageUrl,
      rarity,
    }),
  };
}

function preferText(incoming: string | null, existing: string | null): string | null {
  if (incoming && incoming !== PENDING_TRANSLATION_LABEL) return incoming;
  if (existing && existing !== PENDING_TRANSLATION_LABEL) return existing;
  return incoming ?? existing;
}

/** 再次匯入時，空白或「待補」不會蓋掉已經有的譯名、圖片或稀有度。 */
export function mergeCatalogCard(
  existing: CatalogCardDraft | null,
  incoming: CatalogCardDraft,
): CatalogCardDraft {
  if (!existing) return incoming;
  return finalizeCatalogCard({
    collectorNumber: incoming.collectorNumber || existing.collectorNumber,
    altCollectorNumber: preferText(incoming.altCollectorNumber, existing.altCollectorNumber),
    nameZhTw: preferText(incoming.nameZhTw, existing.nameZhTw),
    nameJa: preferText(incoming.nameJa, existing.nameJa),
    nameEn: preferText(incoming.nameEn, existing.nameEn),
    imageUrl: preferText(incoming.imageUrl, existing.imageUrl),
    imageUrlJa: preferText(incoming.imageUrlJa, existing.imageUrlJa),
    rarity: preferText(incoming.rarity, existing.rarity),
    illustrator: preferText(incoming.illustrator, existing.illustrator),
    regulationMark: preferText(incoming.regulationMark, existing.regulationMark),
  });
}

export function parseCatalogCsv(
  text: string,
  options: { setCode?: string } = {},
): ParsedCatalogCsv {
  const table = parseCsvTable(text);
  if (table.length === 0) {
    throw new CatalogImportError("CSV 是空的");
  }

  const headerRow = table[0];
  const columns = headerRow.map((header) => canonicalHeader(header));
  if (!columns.includes("collectorNumber")) {
    throw new CatalogImportError(
      "CSV 要有收集編號欄（collectorNumber、卡號或 收集編號）。請用範本的表頭。",
    );
  }

  const overrideCode = options.setCode?.trim() ?? "";
  if (overrideCode && !SET_CODE.test(overrideCode)) {
    throw new CatalogImportError("系列代碼只可以是英數、點、底線或連字號，例如 M6、M6a");
  }

  if (table.length > 5001) {
    throw new CatalogImportError("一次最多匯入 5000 張卡");
  }

  const warnings: string[] = [];
  const sets = new Map<string, CatalogSetDraft>();
  const seen = new Map<string, number>();

  for (let index = 1; index < table.length; index++) {
    const cells = table[index];
    const rowNumber = index + 1;
    const value = (column: Column): string => {
      const at = columns.indexOf(column);
      if (at < 0) return "";
      return cells[at]?.trim() ?? "";
    };

    const code = value("setCode") || overrideCode;
    if (!code) {
      throw new CatalogImportError(`第 ${rowNumber} 列沒有系列代碼。請在 CSV 填 setCode，或在後台填系列代碼。`);
    }
    if (!SET_CODE.test(code)) {
      throw new CatalogImportError(`第 ${rowNumber} 列的系列代碼無效：${code}`);
    }

    const collectorRaw = value("collectorNumber");
    const printedNumbers = splitPrintedNumbers(collectorRaw);
    if (printedNumbers.length === 0) {
      throw new CatalogImportError(`第 ${rowNumber} 列沒有收集編號`);
    }

    const bareName = value("name");
    const nameJa = value("nameJa") || (bareName && hasKana(bareName) ? bareName : "");
    const nameZhTw = value("nameZhTw") || (bareName && !hasKana(bareName) ? bareName : "");
    const printedAlt = printedNumbers.slice(1).join(",");
    const card = finalizeCatalogCard({
      collectorNumber: printedNumbers[0],
      altCollectorNumber: value("altCollectorNumber") || printedAlt,
      nameZhTw,
      nameJa,
      nameEn: value("nameEn"),
      imageUrl: value("imageUrl"),
      imageUrlJa: value("imageUrlJa"),
      rarity: value("rarity"),
      illustrator: value("illustrator"),
      regulationMark: value("regulationMark"),
    });

    const duplicateKey = `${code}\u0000${card.collectorNumber}`;
    const previous = seen.get(duplicateKey);
    if (previous) {
      warnings.push(`第 ${rowNumber} 列與第 ${previous} 列的 ${code} ${card.collectorNumber} 重複，採用後面這一列`);
    }
    seen.set(duplicateKey, rowNumber);

    let set = sets.get(code);
    if (!set) {
      set = {
        code,
        nameZhTw: null,
        nameJa: null,
        nameEn: null,
        releaseDate: null,
        regulationMark: null,
        officialUrl: null,
        cards: [],
      };
      sets.set(code, set);
    }

    set.nameZhTw = blankToNull(value("setNameZhTw")) ?? set.nameZhTw;
    set.nameJa = blankToNull(value("setNameJa")) ?? set.nameJa;
    set.nameEn = blankToNull(value("setNameEn")) ?? set.nameEn;
    set.regulationMark = blankToNull(value("regulationMark")) ?? set.regulationMark;
    set.officialUrl = blankToNull(value("officialUrl")) ?? set.officialUrl;
    const releaseDate = parseReleaseDate(value("releaseDate"), rowNumber);
    if (releaseDate) set.releaseDate = releaseDate;

    const existingIndex = set.cards.findIndex((item) => item.collectorNumber === card.collectorNumber);
    if (existingIndex >= 0) set.cards[existingIndex] = card;
    else set.cards.push(card);
  }

  if (sets.size === 0) {
    throw new CatalogImportError("CSV 沒有卡牌資料列");
  }

  for (const set of sets.values()) {
    set.cards.sort((a, b) => a.sortIndex - b.sortIndex || a.collectorNumber.localeCompare(b.collectorNumber));
  }

  return { sets: [...sets.values()], warnings };
}

export function formatReleaseDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}
