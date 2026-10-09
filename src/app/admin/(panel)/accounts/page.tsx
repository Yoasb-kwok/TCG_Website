"use client";

import { AccountsTable } from "@/components/admin/accounts-table";

export default function AdminAccountsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">帳戶</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        查看會員資料、Pokémon ID、積分及購買紀錄。
      </p>
      <div className="mt-6">
        <AccountsTable />
      </div>
    </div>
  );
}
