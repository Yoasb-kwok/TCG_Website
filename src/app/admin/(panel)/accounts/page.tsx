"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AccountsTable } from "@/components/admin/accounts-table";

export default function AdminAccountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="帳戶"
        description="查看會員資料、Pokémon ID、積分及購買紀錄。"
      />
      <AccountsTable />
    </div>
  );
}
