import { CatalogManager } from "@/components/admin/catalog-manager";

export default function AdminCatalogPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">卡表目錄</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        店內卡表存在自己的資料庫。新系列用官方卡表 CSV 匯入，網店和收銀之後可以讀 /api/sets 與 /api/cards。
      </p>
      <div className="mt-6">
        <CatalogManager />
      </div>
    </div>
  );
}
