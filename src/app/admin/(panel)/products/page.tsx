"use client";

import { useState } from "react";
import { ManualSingleForm } from "@/components/admin/manual-single-form";
import { SealedAccessoryForm } from "@/components/admin/sealed-accessory-form";
import { ProductsTable } from "@/components/admin/products-table";
import { InventoryDashboard } from "@/components/admin/inventory-dashboard";
import { RecordDashboard } from "@/components/admin/record-dashboard";

export default function AdminProductsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "single" | "sealed" | "inventory" | "records" | "list"
  >("single");

  const onUpdated = () => setRefreshKey((k) => k + 1);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">商品上架</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        手動填寫商品資料並上傳圖片 · 標籤請至左側「標籤管理」維護
      </p>

      <div className="mt-6 flex gap-2 border-b border-border">
        {(
          [
            ["single", "單卡上架"],
            ["sealed", "卡盒 / 週邊"],
            ["inventory", "庫存管理"],
            ["records", "入貨記錄"],
            ["list", "商品列表"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`border-b-2 px-4 py-2 text-sm transition ${
              activeTab === key
                ? "border-pink-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "single" && <ManualSingleForm onCreated={onUpdated} />}
        {activeTab === "sealed" && <SealedAccessoryForm onCreated={onUpdated} />}
        {activeTab === "inventory" && <InventoryDashboard />}
        {activeTab === "records" && <RecordDashboard />}
        {activeTab === "list" && <ProductsTable key={refreshKey} />}
      </div>

      {(activeTab === "single" || activeTab === "sealed") && (
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="mb-4 text-lg font-semibold">已上架商品</h2>
          <ProductsTable key={refreshKey} />
        </div>
      )}
    </div>
  );
}
