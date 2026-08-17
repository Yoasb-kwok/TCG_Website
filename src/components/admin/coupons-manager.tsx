"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Coupon {
  id: string;
  name: string;
  code: string;
  description: string;
  quantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const QUICK_FILLS = [
  "8折",
  "折價HK$50",
  "買一送一",
  "免運費",
];

export function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formQuantity, setFormQuantity] = useState("0");
  const [formActive, setFormActive] = useState(true);
  const [error, setError] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "讀取失敗" }));
        setCoupons([]);
        setError(err.error);
      } else {
        const data = await res.json();
        setCoupons(data);
      }
    } catch {
      setCoupons([]);
      setError("無法連接伺服器");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormQuantity("0");
    setFormActive(true);
    setEditingId(null);
    setError("");
    setShowForm(false);
  };

  const handleEdit = (c: Coupon) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormCode(c.code);
    setFormDescription(c.description);
    setFormQuantity(String(c.quantity));
    setFormActive(c.isActive);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setError("");
    if (!formName.trim()) {
      setError("請填寫優惠券名稱");
      return;
    }

    const code = formCode.trim() || slugify(formName);
    const quantity = Number(formQuantity);
    if (isNaN(quantity) || quantity < 0) {
      setError("數量必須為 0 或正整數");
      return;
    }

    const body = {
      name: formName.trim(),
      code,
      description: formDescription,
      quantity,
      isActive: formActive,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/coupons/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "更新失敗");
        }
      } else {
        const res = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "建立失敗");
        }
      }
      resetForm();
      fetchCoupons();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失敗");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這個優惠券？")) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "刪除失敗");
      }
      fetchCoupons();
    } catch (e) {
      alert(e instanceof Error ? e.message : "刪除失敗");
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失敗");
      }
      fetchCoupons();
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失敗");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">優惠券列表</h2>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          新增
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="coupon-name">優惠券名稱</Label>
              <Input
                id="coupon-name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editingId) setFormCode(slugify(e.target.value));
                }}
                placeholder="如：Summer Sale"
              />
            </div>
            <div>
              <Label htmlFor="coupon-quantity">數量</Label>
              <Input
                id="coupon-quantity"
                type="number"
                min={0}
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="coupon-description">描述</Label>
              <div className="flex flex-wrap gap-1">
                {QUICK_FILLS.map((fill) => (
                  <button
                    key={fill}
                    type="button"
                    onClick={() => setFormDescription(fill)}
                    className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
                  >
                    {fill}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="coupon-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              placeholder="輸入優惠券描述或點擊上方快捷按鈕"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="coupon-active"
              type="checkbox"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="coupon-active">顯示（有效）</Label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit}>
              {editingId ? "更新" : "建立"}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm}>
              取消
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">名稱</th>
              <th className="pb-2 pr-4 font-medium">描述</th>
              <th className="pb-2 pr-4 font-medium">數量</th>
              <th className="pb-2 pr-4 font-medium">狀態</th>
              <th className="pb-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  暫無優惠券
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">
                    {c.name}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {c.description || "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {c.quantity}
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`rounded px-2 py-0.5 text-xs transition ${
                        c.isActive
                          ? "bg-green-500/15 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.isActive ? "有效" : "停用"}
                    </button>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(c)}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
