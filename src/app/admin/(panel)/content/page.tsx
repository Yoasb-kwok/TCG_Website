"use client";

import { SiteContentManager } from "@/components/admin/site-content-manager";

export default function AdminContentPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold">網站內容</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        編輯首頁 Banner、熱門商品與關於我們內容。
      </p>
      <div className="mt-6">
        <SiteContentManager />
      </div>
    </div>
  );
}
