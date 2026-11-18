import { CsvManager } from "@/components/admin/csv-manager";

export default function AdminDataPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">商品匯入</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        下載商品，或用 CSV／Excel 按條碼新增與更新。檔案是 UTF-8（含 BOM），Excel 與 Google 試算表可顯示繁體中文。有問題的列會隔離並列出原因。
      </p>
      <div className="mt-6">
        <CsvManager />
      </div>
    </div>
  );
}
