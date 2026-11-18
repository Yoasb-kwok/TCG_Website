import JSZip from "jszip";

/**
 * Read the first worksheet of an .xlsx file into a rectangular string table.
 * Enough for a 银豹 product export (shared strings, inline strings, numbers).
 * Does not evaluate formulas.
 */

const SHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

export class XlsxReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XlsxReadError";
  }
}

function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function columnIndex(cellRef: string): number {
  const letters = /^[A-Z]+/i.exec(cellRef)?.[0] ?? "";
  let index = 0;
  for (const char of letters.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

function rowIndex(cellRef: string): number {
  const digits = /(\d+)$/.exec(cellRef)?.[1];
  return digits ? Number(digits) : 0;
}

function sharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const parts = xml.split(/<si[\s>]/).slice(1);
  for (const part of parts) {
    const body = part.split(/<\/si>/)[0] ?? "";
    const texts = [...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) =>
      decodeXml(match[1] ?? ""),
    );
    strings.push(texts.join(""));
  }
  return strings;
}

function worksheetRows(xml: string, strings: string[]): string[][] {
  const rows = new Map<number, Map<number, string>>();
  // Self-closing cells (<c r="D2" s="1"/>) must be tried first. Otherwise the
  // slash is treated as part of the attributes and the next <v> is stolen.
  const cells = xml.matchAll(/<c\b([^>]*?)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g);
  for (const match of cells) {
    const attrs = match[1] ?? match[2] ?? "";
    const inner = match[3] ?? "";
    const ref = /\br="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const col = columnIndex(ref);
    const row = rowIndex(ref);
    if (!ref || col < 0 || row < 1) continue;

    let value = "";
    if (type === "inlineStr") {
      value = [...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
        .map((item) => decodeXml(item[1] ?? ""))
        .join("");
    } else {
      const raw = /<v[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "";
      if (type === "s") {
        value = strings[Number(raw)] ?? "";
      } else if (type === "b") {
        value = raw === "1" ? "true" : "false";
      } else {
        value = decodeXml(raw);
      }
    }

    const line = rows.get(row) ?? new Map<number, string>();
    line.set(col, value);
    rows.set(row, line);
  }

  const ordered = [...rows.keys()].sort((a, b) => a - b);
  if (ordered.length === 0) return [];
  const width = Math.max(...[...rows.values()].map((line) => Math.max(-1, ...line.keys()))) + 1;
  return ordered.map((rowNumber) => {
    const line = rows.get(rowNumber)!;
    return Array.from({ length: width }, (_, index) => line.get(index) ?? "");
  });
}

async function firstSheetPath(zip: JSZip): Promise<string> {
  const rels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!rels) throw new XlsxReadError("Excel 檔缺少工作表");
  const targets = [...rels.matchAll(/Target="([^"]*worksheets\/[^"]+)"/g)].map((match) => match[1]);
  const target = targets[0];
  if (!target) throw new XlsxReadError("Excel 檔沒有工作表");
  const relative = target.replace(/^\//, "").replace(/^\.\.\//, "");
  return relative.startsWith("xl/") ? relative : `xl/${relative}`;
}

export async function readXlsxTable(bytes: Uint8Array): Promise<string[][]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new XlsxReadError("無法讀取 Excel 檔。請上傳 .xlsx，或另存 CSV UTF-8。");
  }

  const sheetPath = await firstSheetPath(zip);
  const sheetXml = await zip.file(sheetPath)?.async("string");
  if (!sheetXml) throw new XlsxReadError("Excel 檔沒有工作表");
  const sharedXml = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const table = worksheetRows(sheetXml, sharedXml ? sharedStrings(sharedXml) : []);
  if (table.length === 0) throw new XlsxReadError("Excel 工作表是空的");
  if (!sheetXml.includes(SHEET_NS) && !sheetXml.includes("<worksheet")) {
    throw new XlsxReadError("無法讀取 Excel 工作表");
  }
  return table;
}
