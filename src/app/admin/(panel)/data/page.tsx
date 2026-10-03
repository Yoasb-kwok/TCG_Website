import { CsvManager } from "@/components/admin/csv-manager";

export default function AdminDataPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">資料備份</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        匯出全部資料表（不含圖片） · 匯入商品 CSV
      </p>

      <div className="mt-6">
        <CsvManager />
      </div>
    </div>
  );
}
