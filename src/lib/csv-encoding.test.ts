import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import {
  CsvEncodingError,
  csvFileResponse,
  decodeCsvUpload,
  excelCsvBytes,
} from "./csv-encoding";
import { recordsToCsv, zipCsvFiles } from "./csv-export";
import { generateTemplateCsv, parseProductCsv, preferredDescription } from "./csv-import";

const NAME = "噴火龍ex";
const DESCRIPTION = "特別插畫, 稀有「SAR」\n第二行說明";

describe("product CSV encoding", () => {
  it("writes a UTF-8 BOM so Excel keeps Traditional Chinese", () => {
    const csv = recordsToCsv([{ name: NAME, description: DESCRIPTION }]);
    const bytes = excelCsvBytes(csv);

    assert.deepEqual(Array.from(bytes.subarray(0, 3)), [0xef, 0xbb, 0xbf]);
    assert.notDeepEqual(Array.from(bytes.subarray(3, 6)), [0xef, 0xbb, 0xbf]);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    assert.equal(rows[0]?.name, NAME);
    assert.equal(rows[0]?.description, DESCRIPTION);
  });

  it("keeps the BOM after the file is stored in the export zip", async () => {
    const csv = recordsToCsv([{ name: "皮卡丘", description: "特別插畫，稀有" }]);
    const zipped = await zipCsvFiles({ product: csv });
    const unzipped = await JSZip.loadAsync(zipped);
    const bytes = await unzipped.file("product.csv")!.async("uint8array");

    assert.deepEqual(Array.from(bytes.subarray(0, 3)), [0xef, 0xbb, 0xbf]);
    const rows = parseProductCsv(decodeCsvUpload(bytes));
    assert.equal(rows[0]?.name, "皮卡丘");
    assert.equal(rows[0]?.description, "特別插畫，稀有");
  });

  it("imports UTF-8 with no BOM (Google Sheets download)", () => {
    const csv = recordsToCsv([{ name: "超夢", description: "隱藏版" }]);
    const bytes = new TextEncoder().encode(csv.replace(/^\uFEFF/, ""));
    assert.notEqual(bytes[0], 0xef);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    assert.equal(rows[0]?.name, "超夢");
    assert.equal(rows[0]?.description, "隱藏版");
  });

  it("imports UTF-16 LE with a BOM (Excel Unicode save)", () => {
    const csv = "name,description\n皮卡丘,雷屬性\n";
    const body = Buffer.from(csv, "utf16le");
    const bytes = new Uint8Array(2 + body.length);
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
    bytes.set(body, 2);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    assert.equal(rows[0]?.name, "皮卡丘");
    assert.equal(rows[0]?.description, "雷屬性");
  });

  it("imports UTF-16 BE with a BOM", () => {
    const csv = "name,description\n皮卡丘,雷屬性\n";
    const le = Buffer.from(csv, "utf16le");
    const be = Buffer.alloc(le.length);
    for (let i = 0; i < le.length; i += 2) {
      be[i] = le[i + 1];
      be[i + 1] = le[i];
    }
    const bytes = new Uint8Array(2 + be.length);
    bytes[0] = 0xfe;
    bytes[1] = 0xff;
    bytes.set(be, 2);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    assert.equal(rows[0]?.name, "皮卡丘");
    assert.equal(rows[0]?.description, "雷屬性");
  });

  it("rejects a non-UTF-8 file instead of storing mojibake", () => {
    const big5ish = new Uint8Array([0xb0, 0xea, 0xa7, 0x4a, 0xff]);
    assert.throws(() => decodeCsvUpload(big5ish), CsvEncodingError);
    assert.throws(() => decodeCsvUpload(big5ish), /UTF-8/);
  });

  it("round-trips the product import template, including a quoted description", () => {
    const bytes = excelCsvBytes(generateTemplateCsv());
    assert.deepEqual(Array.from(bytes.subarray(0, 3)), [0xef, 0xbb, 0xbf]);

    const rows = parseProductCsv(decodeCsvUpload(bytes));
    assert.equal(rows[0]?.name, "皮卡丘");
    assert.equal(rows[0]?.pokemonType, "雷");
    assert.equal(rows[0]?.description, "特別插畫, 稀有");
    assert.equal(rows[0]?.description?.includes("\uFFFD"), false);
  });

  it("keeps a Chinese description instead of the generated card summary", () => {
    const [row] = parseProductCsv(generateTemplateCsv());
    const generated = "SV3 · #045 · POKEMON · 雷";
    assert.equal(preferredDescription(row, generated), "特別插畫, 稀有");
    assert.equal(preferredDescription({ description: "  " }, generated), generated);
    assert.equal(preferredDescription({}, generated), generated);
    assert.equal(preferredDescription({ description: "" }, null), null);
  });

  it("serves a CSV download as UTF-8 with a single BOM", async () => {
    const response = csvFileResponse(
      recordsToCsv([{ name: NAME, description: "特別插畫，稀有" }]),
      "product.csv",
    );
    assert.equal(response.headers.get("Content-Type"), "text/csv; charset=utf-8");
    assert.match(
      response.headers.get("Content-Disposition") ?? "",
      /filename="product\.csv"/,
    );

    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(Array.from(bytes.subarray(0, 3)), [0xef, 0xbb, 0xbf]);
    assert.notDeepEqual(Array.from(bytes.subarray(3, 6)), [0xef, 0xbb, 0xbf]);
    const rows = parseProductCsv(decodeCsvUpload(bytes));
    assert.equal(rows[0]?.name, NAME);
    assert.equal(rows[0]?.description, "特別插畫，稀有");
  });
});
