"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductsTable } from "@/components/admin/products-table";

export default function AdminProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="商品名單"
        description="管理單卡、卡盒、週邊、售價與庫存。這裡只建立貨品。售價和數量在「倉存」點算，撳「進貨」入庫，成本會同時記入損益。回收價和希望回收數量在建立或編輯商品時設定，收卡畫面只顯示。"
      />
      <ProductsTable />
    </div>
  );
}
