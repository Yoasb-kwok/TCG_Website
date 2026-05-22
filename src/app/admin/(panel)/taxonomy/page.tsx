"use client";

import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export default function AdminTaxonomyPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">標籤管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        管理系列編號、稀有度、卡號、類型、屬性；可新增、編輯、刪除與調整排序。
      </p>
      <div className="mt-6">
        <TaxonomyManager variant="page" />
      </div>
    </div>
  );
}
