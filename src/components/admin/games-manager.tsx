"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GameType {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
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

export function GamesManager() {
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formOrder, setFormOrder] = useState("0");
  const [formActive, setFormActive] = useState(true);
  const [error, setError] = useState("");

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/games");
    const data = await res.json();
    setGameTypes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const resetForm = () => {
    setFormName("");
    setFormSlug("");
    setFormOrder("0");
    setFormActive(true);
    setEditingId(null);
    setError("");
    setShowForm(false);
  };

  const handleEdit = (g: GameType) => {
    setEditingId(g.id);
    setFormName(g.name);
    setFormSlug(g.slug);
    setFormOrder(String(g.sortOrder));
    setFormActive(g.isActive);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setError("");
    if (!formName.trim()) {
      setError("請填寫遊戲名稱");
      return;
    }

    const slug = formSlug.trim() || slugify(formName);
    const body = {
      name: formName.trim(),
      slug,
      sortOrder: Number(formOrder) || 0,
      isActive: formActive,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/games/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "更新失敗");
        }
      } else {
        const res = await fetch("/api/admin/games", {
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
      fetchGames();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失敗");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這個遊戲類型？")) return;
    try {
      const res = await fetch(`/api/admin/games/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "刪除失敗");
      }
      fetchGames();
    } catch (e) {
      alert(e instanceof Error ? e.message : "刪除失敗");
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
        <h2 className="text-lg font-semibold text-foreground">遊戲類型</h2>
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
              <Label htmlFor="game-name">遊戲名稱</Label>
              <Input
                id="game-name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editingId) setFormSlug(slugify(e.target.value));
                }}
                placeholder="如：One Piece"
              />
            </div>
            <div className="flex items-end gap-2">
              <input
                id="game-active"
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="game-active">顯示於前台</Label>
            </div>
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
              <th className="pb-2 pr-4 font-medium">狀態</th>
              <th className="pb-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {gameTypes.map((g) => (
              <tr key={g.id} className="border-b border-border/50">
                <td className="py-2 pr-4 font-medium text-foreground">{g.name}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      g.isActive
                        ? "bg-green-500/15 text-green-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {g.isActive ? "顯示" : "隱藏"}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(g)}
                      className="rounded p-1 hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="rounded p-1 hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
