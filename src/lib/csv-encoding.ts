/**
 * Excel on Windows and Mac opens a CSV with the system ANSI code page unless the
 * file starts with a UTF-8 BOM (EF BB BF). Google Sheets accepts that same file
 * and also accepts UTF-8 without a BOM. Product names and descriptions are
 * Traditional Chinese, so every downloadable CSV must carry the BOM, and every
 * upload must decode UTF-8 (BOM optional) instead of guessing a legacy code page.
 */

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

export class CsvEncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvEncodingError";
  }
}

/** UTF-8 bytes with a single leading BOM. Existing BOM characters are not doubled. */
export function excelCsvBytes(csv: string): Uint8Array<ArrayBuffer> {
  const text = csv.replace(/^\uFEFF/, "");
  const body = new TextEncoder().encode(text);
  const buffer = new ArrayBuffer(UTF8_BOM.length + body.byteLength);
  const out = new Uint8Array(buffer);
  out.set(UTF8_BOM, 0);
  out.set(body, UTF8_BOM.length);
  return out;
}

/**
 * Decode an uploaded CSV.
 * Accepts UTF-8 with or without a BOM, and UTF-16 LE/BE when a BOM is present
 * (some Excel "Unicode" saves). Rejects byte sequences that are not valid in
 * that encoding so a Big5/ANSI save cannot be stored as mojibake.
 */
export function decodeCsvUpload(bytes: Uint8Array): string {
  try {
    if (
      bytes.length >= 3 &&
      bytes[0] === UTF8_BOM[0] &&
      bytes[1] === UTF8_BOM[1] &&
      bytes[2] === UTF8_BOM[2]
    ) {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3));
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder("utf-16le", { fatal: true })
        .decode(bytes.subarray(2))
        .replace(/^\uFEFF/, "");
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder("utf-16be", { fatal: true })
        .decode(bytes.subarray(2))
        .replace(/^\uFEFF/, "");
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (err) {
    if (err instanceof CsvEncodingError) throw err;
    throw new CsvEncodingError(
      "CSV 編碼無法讀取。請使用 UTF-8（Excel 請另存為「CSV UTF-8」）。",
    );
  }
}
