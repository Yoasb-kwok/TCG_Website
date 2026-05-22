import "dotenv/config";
import { ensureDefaultTaxonomy } from "../src/lib/taxonomy-db";

async function main() {
  await ensureDefaultTaxonomy();
  console.log("已寫入預設標籤（若資料表為空）。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
