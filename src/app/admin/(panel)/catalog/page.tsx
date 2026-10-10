import { CatalogManager } from "@/components/admin/catalog-manager";

export default function AdminCatalogPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">卡表目錄</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        店內卡表存在自己的資料庫。新系列用官方卡表 CSV 匯入。網店搜尋和收銀會用 /api/cards 的同一份資料對卡名同卡號，條碼和已上架 SKU 維持不變。
      </p>
      <div className="mt-6">
        <CatalogManager />
      </div>
    </div>
  );
}
