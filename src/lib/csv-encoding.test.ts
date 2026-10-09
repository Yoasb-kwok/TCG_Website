import { parse } from "csv-parse/sync";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  CsvEncodingError,
  decodeCsvUpload,
  excelCsvBytes,
} from "@/lib/csv-encoding";
import { recordsToCsv } from "@/lib/csv-export";
import { generateTemplateCsv } from "@/lib/csv-import";

const NAME = "噴火龍ex";
const DESCRIPTION = '特別插畫, 稀有「SAR」\n第二行說明';

function parseProductCsv(text: string) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];
}

describe("product CSV encoding", () => {
  it("writes a UTF-8 BOM so Excel keeps Traditional Chinese", () => {
    const csv = recordsToCsv([
      { name: NAME, description: DESCRIPTION },
    ]);
    const bytes = excelCsvBytes(csv);

    expect(Array.from(bytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(Array.from(bytes.subarray(3, 6))).not.toEqual([0xef, 0xbb, 0xbf]);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    expect(rows[0]?.name).toBe(NAME);
    expect(rows[0]?.description).toBe(DESCRIPTION);
  });

  it("keeps the BOM after the file is stored in the export zip", async () => {
    const csv = recordsToCsv([
      { name: "皮卡丘", description: "特別插畫，稀有" },
    ]);
    const zip = new JSZip();
    zip.file("product.csv", excelCsvBytes(csv));
    const zipped = await zip.generateAsync({ type: "uint8array" });
    const unzipped = await JSZip.loadAsync(zipped);
    const bytes = await unzipped.file("product.csv")!.async("uint8array");

    expect(Array.from(bytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const rows = parseProductCsv(decodeCsvUpload(bytes));
    expect(rows[0]?.name).toBe("皮卡丘");
    expect(rows[0]?.description).toBe("特別插畫，稀有");
  });

  it("imports UTF-8 with no BOM (Google Sheets download)", () => {
    const csv = recordsToCsv([
      { name: "超夢", description: "隱藏版" },
    ]);
    const bytes = new TextEncoder().encode(csv.replace(/^\uFEFF/, ""));
    expect(bytes[0]).not.toBe(0xef);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    expect(rows[0]?.name).toBe("超夢");
    expect(rows[0]?.description).toBe("隱藏版");
  });

  it("imports UTF-16 LE with a BOM (Excel Unicode save)", () => {
    const csv = "name,description\n皮卡丘,雷屬性\n";
    const body = Buffer.from(csv, "utf16le");
    const bytes = new Uint8Array(2 + body.length);
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
    bytes.set(body, 2);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    expect(rows[0]?.name).toBe("皮卡丘");
    expect(rows[0]?.description).toBe("雷屬性");
  });

  it("rejects a non-UTF-8 file instead of storing mojibake", () => {
    const big5ish = new Uint8Array([0xb0, 0xea, 0xa7, 0x4a, 0xff]);
    expect(() => decodeCsvUpload(big5ish)).toThrow(CsvEncodingError);
    expect(() => decodeCsvUpload(big5ish)).toThrow(/UTF-8/);
  });

  it("round-trips the product import template, including a quoted description", () => {
    const bytes = excelCsvBytes(generateTemplateCsv());
    expect(Array.from(bytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    expect(rows[0]?.name).toBe("皮卡丘");
    expect(rows[0]?.pokemonType).toBe("雷");
    expect(rows[0]?.description).toBe("特別插畫, 稀有");
    expect(rows[0]?.description?.includes("\uFFFD")).toBe(false);
  });
});
