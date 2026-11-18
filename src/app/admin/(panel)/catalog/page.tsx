import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CatalogManager } from "@/components/admin/catalog-manager";

export default function AdminCatalogPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="卡表目錄"
        description="店內卡表存在自己的資料庫。新系列用官方卡表 CSV 匯入。網店搜尋和收銀會用同一份資料對卡名同卡號，條碼和已上架 SKU 維持不變。"
      />
      <CatalogManager />
    </div>
  );
}
