"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";

interface AccountRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
  pokemonId: string | null;
  points: number;
  purchaseCount: number;
}

const ROLE_LABELS: Record<AccountRow["role"], string> = {
  USER: "會員",
  ADMIN: "管理員",
};

export function AccountsTable() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [databaseConfigured, setDatabaseConfigured] = useState(true);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (query) params.set("search", query);

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?${params}`, { signal: controller.signal });
        const data = (await res.json()) as {
          users?: AccountRow[];
          total?: number;
          totalPages?: number;
          databaseConfigured?: boolean;
        };
        if (controller.signal.aborted) return;
        setAccounts(data.users ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setDatabaseConfigured(data.databaseConfigured !== false);
        setLoading(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [page, query]);

  return (
    <div className="space-y-4">
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="搜尋姓名、電郵、電話或 Pokémon ID"
        aria-label="搜尋帳戶"
      />

      {!databaseConfigured && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          請先設定 DATABASE_URL，才能查看及編輯帳戶。
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card text-left text-muted-foreground">
            <tr>
              <th className="p-3">姓名</th>
              <th className="p-3">電郵</th>
              <th className="p-3">電話</th>
              <th className="p-3">Pokémon ID</th>
              <th className="p-3 text-right">積分</th>
              <th className="p-3 text-right">購買次數</th>
              <th className="p-3">身份</th>
              <th className="p-3 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-border">
                <td className="p-3 font-medium text-foreground">{account.name || "—"}</td>
                <td className="p-3 text-muted-foreground">{account.email}</td>
                <td className="p-3 text-muted-foreground">{account.phone || "—"}</td>
                <td className="p-3 text-muted-foreground">{account.pokemonId || "—"}</td>
                <td className="p-3 text-right tabular-nums">{account.points.toLocaleString("zh-HK")}</td>
                <td className="p-3 text-right tabular-nums">{account.purchaseCount}</td>
                <td className="p-3 text-muted-foreground">{ROLE_LABELS[account.role]}</td>
                <td className="p-3">
                  <Link
                    href={`/admin/accounts/${account.id}`}
                    className="font-medium text-pink-400 hover:text-pink-300"
                  >
                    帳戶詳細
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-8 text-center text-muted-foreground">載入中...</p>}
        {!loading && accounts.length === 0 && (
          <p className="p-8 text-center text-muted-foreground">
            {databaseConfigured ? "暫無帳戶" : "尚未連接資料庫"}
          </p>
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>共 {total} 個帳戶</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="上一頁"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              aria-label="下一頁"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
