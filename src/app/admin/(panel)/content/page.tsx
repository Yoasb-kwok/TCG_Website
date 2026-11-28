"use client";

import { SiteContentManager } from "@/components/admin/site-content-manager";

export default function AdminContentPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">網站內容</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        編輯首頁 Banner、服務卡圖片與文案、單卡回收、商品選單 Banner、關於我們內容與門市路線影片。熱門商品暫時按已完成購買件數自動排列。
      </p>
      <div className="mt-6">
        <SiteContentManager />
      </div>
    </div>
  );
}
