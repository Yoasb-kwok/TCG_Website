import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CsvManager } from "@/components/admin/csv-manager";

export default function AdminDataPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="商品 CSV"
        description="下載商品名稱與描述，或用同一份格式建立新商品。檔案是 UTF-8（含 BOM），Excel 與 Google 試算表可顯示繁體中文。"
      />
      <CsvManager />
    </div>
  );
}
