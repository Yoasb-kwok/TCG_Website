"use client";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SiteContentManager } from "@/components/admin/site-content-manager";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminContentPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="網站內容"
        description="編輯首頁 Banner、商品選單 Banner、熱門商品、關於我們內容與門市路線影片。"
        action={
          <Link href="/" target="_blank" className={cn(buttonVariants({ variant: "primary" }), "w-fit")}>
            預覽網站
          </Link>
        }
      />
      <SiteContentManager />
    </div>
  );
}
