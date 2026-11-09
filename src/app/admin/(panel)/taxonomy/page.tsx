"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export default function AdminTaxonomyPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="標籤管理"
        description="集中管理商品標籤與卡牌分類，更新後同步套用至前台篩選。"
      />
      <TaxonomyManager variant="page" />
    </div>
  );
}
