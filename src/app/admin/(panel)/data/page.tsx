import { CsvManager } from "@/components/admin/csv-manager";

export default function AdminDataPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">商品 CSV</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        下載商品名稱與描述，或用同一份格式建立新商品。檔案是 UTF-8（含 BOM），Excel 與 Google 試算表可顯示繁體中文。
      </p>
      <div className="mt-6">
        <CsvManager />
      </div>
    </div>
  );
}
