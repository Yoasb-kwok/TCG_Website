import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { parseCsvTable } from "./catalog-csv";
import { decodeCsvUpload, excelCsvBytes } from "./csv-encoding";
import {
  classifyProductRows,
  mapClientCategory,
  type ImportSnapshot,
} from "./product-import";
import { slugifyProduct } from "./product-slug";
import { readXlsxTable } from "./xlsx-sheet";

const empty: ImportSnapshot = { slugs: [], skus: [], variants: [] };

const POS_HEADER = [
  "名称（必填）",
  "分类（必填）",
  "条码",
  "库存量",
  "进货价（必填）",
  "批发价（必填）",
  "销售价",
  "会员价",
  "会员折扣",
  "积分商品",
  "商品状态",
].join(",");

function posRow(
  name: string,
  category: string,
  barcode: string,
  stock: string,
  cost: string,
  wholesale: string,
  price: string,
  extra = "0,是,是,启用",
) {
  return [name, category, barcode, stock, cost, wholesale, price, extra].join(",");
}

function plan(csv: string, existing: ImportSnapshot = empty) {
  return classifyProductRows(parseCsvTable(csv), existing);
}

function creates(csv: string, existing?: ImportSnapshot) {
  return plan(csv, existing).decisions.filter((row) => row.action === "create");
}

function quarantines(csv: string, existing?: ImportSnapshot) {
  return plan(csv, existing).decisions.flatMap((row) =>
    row.action === "quarantine" ? [row.quarantine] : [],
  );
}

describe("client category mapping", () => {
  it("maps 盒裝 / 包 / PCS / 罐 / 支 onto product types", () => {
    assert.equal(mapClientCategory("盒裝"), "SEALED_BOX");
    assert.equal(mapClientCategory("盒装"), "SEALED_BOX");
    assert.equal(mapClientCategory("包"), "BOOSTER_PACK");
    assert.equal(mapClientCategory("PCS"), "SINGLE");
    assert.equal(mapClientCategory("pcs"), "SINGLE");
    assert.equal(mapClientCategory("罐"), "TIN");
    assert.equal(mapClientCategory("支"), "BOTTLE");
    assert.equal(mapClientCategory("SINGLE"), "SINGLE");
    assert.equal(mapClientCategory("零食"), null);
  });
});

describe("barcode upsert and quarantine", () => {
  const csv = [
    POS_HEADER,
    posRow("卡套(日版)", "包", "1000000000001", "2", "48", "90", "95"),
    posRow("卡套(日版)", "包", "1000000000002", "1", "48", "90", "68"),
    posRow("Commission", "PCS", "1000000000003", "99999999.99", "0", "0", "0"),
    posRow("locker/6m", "PCS", "1000000000004", "999", "0", "510", "510"),
    posRow("零成本卡", "PCS", "1000000000005", "1", "0", "25", "25"),
    posRow("倒掛盒", "盒裝", "1000000000006", "1", "165", "150", "170"),
    posRow("罐裝奶", "罐", "1000000000007", "3", "4", "6", "8"),
    posRow("支裝茶", "支", "1000000000008", "5", "3", "5", "8"),
    posRow("負庫存", "PCS", "1000000000009", "-1", "10", "20", "30"),
    posRow("卡套(日版)", "包", "1000000000001", "4", "48", "90", "96"),
  ].join("\n");

  it("keeps same-name barcodes as separate creates and maps types", () => {
    const rows = creates(csv);
    assert.equal(rows.length, 4);
    const sleeves = rows.filter(
      (row) => row.action === "create" && row.data.name === "卡套(日版)",
    );
    assert.equal(sleeves.length, 2);
    assert.deepEqual(
      sleeves.map((row) => (row.action === "create" ? row.data.barcode : "")),
      ["1000000000001", "1000000000002"],
    );
    assert.notEqual(
      sleeves[0]?.action === "create" ? sleeves[0].data.slug : "",
      sleeves[1]?.action === "create" ? sleeves[1].data.slug : "",
    );
    const tin = rows.find((row) => row.action === "create" && row.data.type === "TIN");
    const bottle = rows.find((row) => row.action === "create" && row.data.type === "BOTTLE");
    assert.equal(tin?.action === "create" ? tin.data.condition : "", "New");
    assert.equal(bottle?.action === "create" ? bottle.data.sku : "", "1000000000008");
    assert.equal(sleeves[0]?.action === "create" ? sleeves[0].data.type : "", "BOOSTER_PACK");
    assert.equal(sleeves[0]?.action === "create" ? sleeves[0].data.memberDiscount : false, true);
    assert.equal(sleeves[0]?.action === "create" ? sleeves[0].data.pointsProduct : false, true);
    assert.equal(sleeves[0]?.action === "create" ? sleeves[0].data.memberPrice : null, 0);
    assert.equal(sleeves[0]?.action === "create" ? sleeves[0].data.cost : null, 48);
    assert.equal(sleeves[0]?.action === "create" ? sleeves[0].data.wholesalePrice : null, 90);
  });

  it("quarantines bad stock, zero cost, price anomalies, and service SKUs", () => {
    const held = quarantines(csv);
    const byName = Object.fromEntries(held.map((row) => [row.name, row.reasons]));
    assert.deepEqual(byName.Commission.sort(), ["cost_zero", "retail_zero", "stock_not_integer"]);
    assert.ok(byName["locker/6m"].includes("service_sku"));
    assert.ok(byName["locker/6m"].includes("cost_zero"));
    assert.deepEqual(byName["零成本卡"], ["cost_zero"]);
    assert.deepEqual(byName["倒掛盒"], ["price_below_cost"]);
    assert.deepEqual(byName["負庫存"], ["stock_not_integer"]);
    assert.deepEqual(byName["卡套(日版)"], ["duplicate_barcode"]);
    assert.equal(
      held.some((row) => row.reasons.length === 0),
      false,
    );
  });

  it("updates name, price, stock, and commercial fields when the barcode exists", () => {
    const csvUpdate = [
      POS_HEADER,
      posRow("卡套(日版) 新名", "包", "1000000000001", "9", "50", "80", "99", "68,否,否,启用"),
    ].join("\n");
    const [decision] = plan(csvUpdate, {
      slugs: ["old"],
      skus: ["OLD"],
      variants: [
        {
          variantId: "var-1",
          productId: "prod-1",
          barcode: "1000000000001",
          sku: "OLD",
        },
      ],
    }).decisions;
    assert.equal(decision?.action, "update");
    if (decision?.action !== "update") return;
    assert.equal(decision.data.productId, "prod-1");
    assert.equal(decision.data.variantId, "var-1");
    assert.equal(decision.data.name, "卡套(日版) 新名");
    assert.equal(decision.data.type, "BOOSTER_PACK");
    assert.equal(decision.data.price, 99);
    assert.equal(decision.data.stock, 9);
    assert.equal(decision.data.cost, 50);
    assert.equal(decision.data.wholesalePrice, 80);
    assert.equal(decision.data.memberPrice, 68);
    assert.equal(decision.data.memberDiscount, false);
    assert.equal(decision.data.pointsProduct, false);
    assert.equal("slug" in decision.data, false);
  });

  it("still creates a legacy single without a barcode and skips the same slug", () => {
    const legacy = [
      "name,type,setCode,rarityTier,cardNumber,price,stock,description",
      "皮卡丘,SINGLE,SV3,R,045,50,10,特別插畫",
    ].join("\n");
    const [created] = creates(legacy);
    assert.equal(created?.action, "create");
    if (created?.action !== "create") return;
    assert.equal(created.data.type, "SINGLE");
    assert.equal(created.data.barcode, null);
    assert.equal(created.data.description, "特別插畫");
    assert.equal(created.data.setCode, "SV3");
    const slug = slugifyProduct("皮卡丘", "SV3-045");
    assert.equal(created.data.slug, slug);
    const again = plan(legacy, {
      slugs: [slug],
      skus: [created.data.sku],
      variants: [],
    });
    assert.equal(again.decisions[0]?.action, "skip");
  });

  it("reads a UTF-8 BOM Excel CSV without dropping Traditional Chinese headers", () => {
    const csv = [
      POS_HEADER,
      posRow("噴火龍ex", "盒裝", "4890000000099", "1", "100", "120", "150"),
    ].join("\n");
    const rows = classifyProductRows(parseCsvTable(decodeCsvUpload(excelCsvBytes(csv))), empty);
    const decision = rows.decisions[0];
    assert.equal(rows.pospal, true);
    assert.equal(decision?.action, "create");
    if (decision?.action !== "create") return;
    assert.equal(decision.data.name, "噴火龍ex");
    assert.equal(decision.data.type, "SEALED_BOX");
    assert.equal(decision.data.condition, "Sealed");
  });
});

describe("extended barcode", () => {
  it("stores three distinct second codes and updates them on barcode match", () => {
    const header = `${POS_HEADER},扩展条码`;
    const csv = [
      header,
      `${posRow("能量 MET", "PCS", "0400723832986", "2", "1", "2", "3")},04007238329863`,
      `${posRow("慶祝包", "包", "2281611513426", "1", "20", "25", "30")},4711460102024`,
      `${posRow("特典卡", "PCS", "2384460911020", "4", "5", "8", "12")},4521329420509`,
    ].join("\n");
    const rows = creates(csv);
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => (row.action === "create" ? row.data.extendedBarcode : "")),
      ["04007238329863", "4711460102024", "4521329420509"],
    );
    assert.equal(rows[0]?.action === "create" ? typeof rows[0].data.memberDiscount : "", "boolean");

    const [updated] = plan(
      [
        header,
        `${posRow("能量 MET", "PCS", "0400723832986", "3", "1", "2", "4")},9990000000001`,
      ].join("\n"),
      {
        slugs: [],
        skus: [],
        variants: [
          {
            variantId: "var-met",
            productId: "prod-met",
            barcode: "0400723832986",
            extendedBarcode: "04007238329863",
            sku: "0400723832986",
          },
        ],
      },
    ).decisions;
    assert.equal(updated?.action, "update");
    if (updated?.action !== "update") return;
    assert.equal(updated.data.extendedBarcode, "9990000000001");
    assert.equal(updated.data.variantId, "var-met");
  });

  it("quarantines a second code that copies another row's primary barcode", () => {
    const header = `${POS_HEADER},扩展条码`;
    const csv = [
      header,
      `${posRow("主貨", "包", "1000000000101", "1", "10", "12", "15")},`,
      `${posRow("第二貨", "包", "1000000000102", "1", "10", "12", "15")},1000000000101`,
    ].join("\n");
    const held = quarantines(csv);
    assert.equal(held.length, 1);
    assert.deepEqual(held[0]?.reasons, ["duplicate_barcode"]);
    assert.equal(creates(csv).length, 1);
  });
});

describe("xlsx product sheet", () => {
  it("reads shared strings and upserts by barcode", async () => {
    const shared = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>名称（必填）</t></si>
  <si><t>分类（必填）</t></si>
  <si><t>条码</t></si>
  <si><t>库存量</t></si>
  <si><t>进货价（必填）</t></si>
  <si><t>批发价（必填）</t></si>
  <si><t>销售价</t></si>
  <si><t>会员价</t></si>
  <si><t>会员折扣</t></si>
  <si><t>积分商品</t></si>
  <si><t>卡套(日版)</t></si>
  <si><t>包</t></si>
  <si><t>是</t></si>
</sst>`;
    const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
      <c r="C1" t="s"><v>2</v></c>
      <c r="D1" t="s"><v>3</v></c>
      <c r="E1" t="s"><v>4</v></c>
      <c r="F1" t="s"><v>5</v></c>
      <c r="G1" t="s"><v>6</v></c>
      <c r="H1" t="s"><v>7</v></c>
      <c r="I1" t="s"><v>8</v></c>
      <c r="J1" t="s"><v>9</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>10</v></c>
      <c r="B2" t="s"><v>11</v></c>
      <c r="C2"><v>1000000000001</v></c>
      <c r="D2"><v>2</v></c>
      <c r="E2"><v>48</v></c>
      <c r="F2"><v>90</v></c>
      <c r="G2"><v>95</v></c>
      <c r="H2"><v>0</v></c>
      <c r="I2" t="s"><v>12</v></c>
      <c r="J2" t="s"><v>12</v></c>
      <c r="K2" s="1"/>
    </row>
  </sheetData>
</worksheet>`;
    const zip = new JSZip();
    zip.file(
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    );
    zip.file("xl/sharedStrings.xml", shared);
    zip.file("xl/worksheets/sheet1.xml", sheet);
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
    const table = await readXlsxTable(bytes);
    const [decision] = classifyProductRows(table, empty).decisions;
    assert.equal(decision?.action, "create");
    if (decision?.action !== "create") return;
    assert.equal(decision.data.name, "卡套(日版)");
    assert.equal(decision.data.type, "BOOSTER_PACK");
    assert.equal(decision.data.barcode, "1000000000001");
    assert.equal(decision.data.stock, 2);
    assert.equal(decision.data.price, 95);
    assert.equal(decision.data.extendedBarcode, null);
  });

  it("does not treat a styled empty cell as the next column's value", async () => {
    const shared = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>名称（必填）</t></si>
  <si><t>分类（必填）</t></si>
  <si><t>条码</t></si>
  <si><t>扩展条码</t></si>
  <si><t>库存量</t></si>
  <si><t>进货价（必填）</t></si>
  <si><t>批发价（必填）</t></si>
  <si><t>销售价</t></si>
  <si><t>会员价</t></si>
  <si><t>会员折扣</t></si>
  <si><t>积分商品</t></si>
  <si><t>能量 MET</t></si>
  <si><t>PCS</t></si>
  <si><t>0400723832986</t></si>
  <si><t>04007238329863</t></si>
  <si><t>是</t></si>
  <si><t>无</t></si>
</sst>`;
    const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c>
      <c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c>
      <c r="G1" t="s"><v>6</v></c><c r="H1" t="s"><v>7</v></c><c r="I1" t="s"><v>9</v></c>
      <c r="J1" t="s"><v>10</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>11</v></c><c r="B2" t="s"><v>12</v></c><c r="C2" t="s"><v>13</v></c>
      <c r="D2" s="1"/>
      <c r="E2"><v>2</v></c><c r="F2"><v>1</v></c><c r="G2"><v>2</v></c><c r="H2"><v>3</v></c>
      <c r="I2" t="s"><v>15</v></c><c r="J2" t="s"><v>15</v></c>
    </row>
    <row r="3">
      <c r="A3" t="s"><v>11</v></c><c r="B3" t="s"><v>12</v></c><c r="C3"><v>2281611513426</v></c>
      <c r="D3" t="s"><v>14</v></c>
      <c r="E3"><v>1</v></c><c r="F3"><v>20</v></c><c r="G3"><v>25</v></c><c r="H3"><v>30</v></c>
      <c r="I3" t="s"><v>15</v></c><c r="J3" t="s"><v>15</v></c>
    </row>
  </sheetData>
</worksheet>`;
    const zip = new JSZip();
    zip.file(
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    );
    zip.file("xl/sharedStrings.xml", shared);
    zip.file("xl/worksheets/sheet1.xml", sheet);
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
    const decisions = classifyProductRows(await readXlsxTable(bytes), empty).decisions;
    const created = decisions.filter((row) => row.action === "create");
    assert.equal(created.length, 2);
    assert.equal(created[0]?.action === "create" ? created[0].data.extendedBarcode : "x", null);
    assert.equal(created[0]?.action === "create" ? created[0].data.stock : 0, 2);
    assert.equal(created[1]?.action === "create" ? created[1].data.extendedBarcode : "", "04007238329863");
    assert.equal(decisions.some((row) => row.action === "quarantine"), false);
  });
});
