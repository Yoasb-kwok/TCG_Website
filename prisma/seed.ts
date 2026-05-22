/**
 * 預設不寫入商品（改由後台手動上架）。
 * 建立管理員：npm run db:seed-admin
 */
import "dotenv/config";

async function main() {
  console.log("略過商品種子。請使用後台手動上架，或 npm run db:seed-admin 建立管理員。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
