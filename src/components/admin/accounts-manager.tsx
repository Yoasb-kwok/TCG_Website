"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Search,
  Trash2,
  RotateCcw,
  Receipt,
  Pencil,
  Download,
  Mail,
  MailWarning,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";

interface AccountRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  deletedAt: string | null;
  createdAt: string;
  pendingEmailChange: boolean;
}

export function AccountsManager() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  // 編輯視窗狀態
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editError, setEditError] = useState("");

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("sort", sort);
      if (includeDeleted) params.set("includeDeleted", "true");
      const res = await fetch(`/api/admin/accounts?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "讀取失敗" }));
        setAccounts([]);
        setError(err.error ?? "讀取失敗");
      } else {
        const data = await res.json();
        setAccounts(data);
      }
    } catch {
      setAccounts([]);
      setError("無法連接伺服器");
    }
    setLoading(false);
  }, [search, sort, includeDeleted]);

  useEffect(() => {
    const debounce = setTimeout(fetchAccounts, 300);
    return () => clearTimeout(debounce);
  }, [fetchAccounts]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === accounts.length
        ? new Set()
        : new Set(accounts.map((a) => a.id)),
    );
  };

  const handleExportCsv = async () => {
    if (selected.size === 0) return;
    try {
      const res = await fetch("/api/admin/accounts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "匯出失敗");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "accounts.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("匯出失敗");
    }
  };

  const handleDelete = async (a: AccountRow) => {
    if (
      !confirm(
        `確定要刪除帳戶「${a.name ?? a.email}」？\n刪除後帳戶無法登入，但電郵會被保留，無法被重新註冊。`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/accounts/${a.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "刪除失敗");
      }
      fetchAccounts();
    } catch (e) {
      alert(e instanceof Error ? e.message : "刪除失敗");
    }
  };

  const handleUndelete = async (a: AccountRow) => {
    try {
      const res = await fetch(`/api/admin/accounts/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedAt: null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "還原失敗");
      }
      fetchAccounts();
    } catch (e) {
      alert(e instanceof Error ? e.message : "還原失敗");
    }
  };

  const openEdit = (a: AccountRow) => {
    setEditing(a);
    setEditName(a.name ?? "");
    setEditPhone(a.phone ?? "");
    setNewEmail("");
    setEditMessage("");
    setEditError("");
  };

  const closeEdit = () => {
    setEditing(null);
    setEditMessage("");
    setEditError("");
  };

  const editAction = async (fn: () => Promise<Response>) => {
    setEditBusy(true);
    setEditMessage("");
    setEditError("");
    try {
      const res = await fn();
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        newEmail?: string;
      };
      if (!res.ok) {
        setEditError(data.error ?? "操作失敗");
        return;
      }
      setEditMessage(data.message ?? "操作成功");
      await fetchAccounts();
      // 重新同步編輯視窗內的帳戶資料
      if (editing) {
        const refreshed = await fetch(`/api/admin/accounts?q=${editing.id}`);
        if (refreshed.ok) {
          const rows = (await refreshed.json()) as AccountRow[];
          const match = rows.find((r) => r.id === editing.id);
          if (match) {
            setEditing(match);
            setEditName(match.name ?? "");
            setEditPhone(match.phone ?? "");
          }
        }
      }
    } catch {
      setEditError("網絡錯誤，請稍後再試");
    } finally {
      setEditBusy(false);
    }
  };

  const saveProfile = () =>
    editAction(() =>
      fetch(`/api/admin/accounts/${editing!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      }),
    );

  const initiateEmailChange = () => {
    if (!newEmail.trim()) {
      setEditError("請輸入新電郵");
      return;
    }
    return editAction(() =>
      fetch(`/api/admin/accounts/${editing!.id}/email-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      }),
    );
  };

  const reverseEmailChange = () =>
    editAction(() =>
      fetch(`/api/admin/accounts/${editing!.id}/email-change/reverse`, {
        method: "POST",
      }),
    );

  const sendPasswordReset = () =>
    editAction(() =>
      fetch(`/api/admin/accounts/${editing!.id}/send-reset`, {
        method: "POST",
      }),
    );

  return (
    <div className="space-y-4">
      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜尋 ID、名稱、電郵、電話…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            setSort((s) => (s === "newest" ? "oldest" : "newest"))
          }
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          {sort === "newest" ? "最新加入 ↓" : "最早加入 ↑"}
        </button>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="h-4 w-4"
          />
          顯示已刪除
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCsv}
          disabled={selected.size === 0}
        >
          <Download className="mr-1 h-4 w-4" />
          匯出 CSV（{selected.size}）
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 帳戶列表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={
                    accounts.length > 0 && selected.size === accounts.length
                  }
                  onChange={toggleSelectAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">名稱</th>
              <th className="px-3 py-2">電郵</th>
              <th className="px-3 py-2">電話</th>
              <th className="px-3 py-2">加入日期</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  暫無帳戶
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td
                    className="px-3 py-3 font-mono text-xs text-muted-foreground"
                    title={a.id}
                  >
                    {a.id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-3 font-medium">
                    {a.name ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{a.email}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {a.phone ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.pendingEmailChange && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-600">
                          電郵待驗證
                        </span>
                      )}
                      {a.deletedAt && (
                        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-500">
                          已刪除
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        title="詳細 / 編輯"
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/admin/transactions?email=${encodeURIComponent(a.email)}`}
                        title="查看交易紀錄"
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Receipt className="h-4 w-4" />
                      </Link>
                      {a.deletedAt ? (
                        <button
                          type="button"
                          onClick={() => handleUndelete(a)}
                          title="還原帳戶"
                          className="rounded p-1 hover:bg-muted"
                        >
                          <RotateCcw className="h-4 w-4 text-green-600" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(a)}
                          title="刪除帳戶"
                          className="rounded p-1 hover:bg-muted"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 編輯視窗 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">帳戶詳細</h3>
              <button
                type="button"
                onClick={closeEdit}
                title="關閉"
                className="rounded p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>ID：{editing.id}</p>
              <p>加入日期：{formatDate(editing.createdAt)}</p>
              {editing.deletedAt && (
                <p className="text-red-500">已刪除：{formatDate(editing.deletedAt)}</p>
              )}
            </div>

            {/* 基本資料 */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">基本資料</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit-name">名稱</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">電話</Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>
              <Button size="sm" onClick={saveProfile} disabled={editBusy}>
                儲存基本資料
              </Button>
            </div>

            {/* 電郵變更（State 1） */}
            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold">電郵變更</h4>
              {editing.pendingEmailChange ? (
                <div className="space-y-2">
                  <p className="rounded bg-amber-500/10 p-2 text-xs text-amber-600">
                    此帳戶有進行中的電郵變更（待用戶以新電郵登入並驗證）。
                    如屬誤操作，可按以下按鈕還原為舊電郵。
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={reverseEmailChange}
                    disabled={editBusy}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    還原電郵變更
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="new-email">新電郵</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    變更後帳戶電郵立即改為新電郵；用戶須以新電郵登入並輸入
                    OTP 驗證後方能繼續使用。密碼重設會被封鎖直至驗證完成或還原。
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={initiateEmailChange}
                    disabled={editBusy}
                  >
                    <MailWarning className="mr-1 h-4 w-4" />
                    確認變更電郵
                  </Button>
                </div>
              )}
            </div>

            {/* 密碼重設 */}
            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-sm font-semibold">密碼</h4>
              <p className="text-xs text-muted-foreground">
                基於安全理由，密碼為單向加密，無法查看。如用戶忘記密碼，可發送重設驗證碼至其電郵。
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={sendPasswordReset}
                disabled={editBusy}
              >
                <Mail className="mr-1 h-4 w-4" />
                發送密碼重設驗證碼
              </Button>
            </div>

            {editMessage && (
              <p className="text-sm text-green-600">{editMessage}</p>
            )}
            {editError && <p className="text-sm text-red-500">{editError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
