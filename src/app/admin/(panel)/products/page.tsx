"use client";

import { ProductsTable } from "@/components/admin/products-table";

export default function AdminProductsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">商品名單</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        這裡只建立貨品。售價和數量在收銀的「來貨」點算，成本會同時記入損益。
      </p>
      <div className="mt-6">
        <ProductsTable />
      </div>
    </div>
  );
}
