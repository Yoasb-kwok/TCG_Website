"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatPrice } from "@/lib/format";
import { FORM_FIELD_INPUT_CLASS } from "@/lib/search-bar-styles";

interface Account {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
  pokemonId: string | null;
  points: number;
  createdAt: string;
}

interface PurchaseItem {
  quantity: number;
  unitPrice: number;
  variant: {
    condition: string;
    product: { name: string };
  };
}

interface Purchase {
  id: string;
  email: string;
  userId: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: PurchaseItem[];
}

const ROLE_LABELS: Record<Account["role"], string> = {
  USER: "會員",
  ADMIN: "管理員",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  SHIPPED: "已發貨",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export function AccountDetail({ userId }: { userId: string }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [orders, setOrders] = useState<Purchase[]>([]);
  const [pokemonId, setPokemonId] = useState("");
  const [points, setPoints] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = (await res.json()) as {
        user?: Account;
        orders?: Purchase[];
        error?: string;
      };
      if (cancelled) return;
      if (!res.ok || !data.user) {
        setAccount(null);
        setError(data.error ?? "無法載入帳戶");
        setLoading(false);
        return;
      }
      setAccount(data.user);
      setOrders(data.orders ?? []);
      setPokemonId(data.user.pokemonId ?? "");
      setPoints(String(data.user.points));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account) return;

    const trimmedPoints = points.trim();
    if (!/^\d+$/.test(trimmedPoints)) {
      setNotice(null);
      setError("積分必須為 0 或以上的整數");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/admin/users/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pokemonId,
        points: Number(trimmedPoints),
      }),
    });
    const data = (await res.json()) as { user?: Account; error?: string };
    setSaving(false);

    if (!res.ok || !data.user) {
      setError(data.error ?? "儲存失敗");
      return;
    }

    setAccount((current) => (current ? { ...current, ...data.user } : data.user ?? null));
    setPokemonId(data.user.pokemonId ?? "");
    setPoints(String(data.user.points));
    setNotice("已儲存");
  };

  if (loading) {
    return <p className="p-8 text-sm text-muted-foreground">載入中...</p>;
  }

  if (!account) {
    return (
      <div className="p-8">
        <Link href="/admin/accounts" className="text-sm text-muted-foreground hover:text-foreground">
          ← 返回帳戶名單
        </Link>
        <p className="mt-6 text-sm text-amber-400">{error ?? "找不到此帳戶"}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link href="/admin/accounts" className="text-sm text-muted-foreground hover:text-foreground">
        ← 返回帳戶名單
      </Link>
      <h1 className="mt-4 text-2xl font-bold">帳戶詳細</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {account.name || "未填姓名"} · {account.email}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">基本資料</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">姓名</dt>
              <dd>{account.name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">電郵</dt>
              <dd className="truncate">{account.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">電話</dt>
              <dd>{account.phone || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">身份</dt>
              <dd>{ROLE_LABELS[account.role]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">建立時間</dt>
              <dd>{formatDate(account.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <form onSubmit={save} className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">會員資料</h2>
          <p className="mt-1 text-sm text-muted-foreground">職員可修改 Pokémon ID 及積分。</p>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pokemon-id">Pokémon ID</Label>
              <Input
                id="pokemon-id"
                value={pokemonId}
                onChange={(event) => setPokemonId(event.target.value)}
                placeholder="例如 1234-5678"
                maxLength={64}
                className={FORM_FIELD_INPUT_CLASS}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">積分</Label>
              <Input
                id="points"
                inputMode="numeric"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                className={FORM_FIELD_INPUT_CLASS}
                autoComplete="off"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {notice && <p className="mt-3 text-sm text-emerald-400">{notice}</p>}
          <Button
            type="submit"
            disabled={saving}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </form>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">購買紀錄</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          此帳戶的網店訂單，包含以相同電郵結帳的紀錄。共 {orders.length} 筆。
        </p>
        <div className="mt-4 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{STATUS_LABELS[order.status] ?? order.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)} · {order.id.slice(0, 8)}
                    {order.userId !== account.id ? " · 以相同電郵記錄" : ""}
                  </p>
                </div>
                <p className="text-lg font-semibold">{formatPrice(order.totalAmount)}</p>
              </div>
              <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
                {order.items.map((item, index) => (
                  <li key={`${order.id}-${index}`}>
                    {item.variant.product.name} ({item.variant.condition}) ×{item.quantity} —{" "}
                    {formatPrice(item.unitPrice * item.quantity)}
                  </li>
                ))}
                {order.items.length === 0 && <li>此訂單沒有商品明細</li>}
              </ul>
            </article>
          ))}
          {orders.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
              暫無購買紀錄
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
