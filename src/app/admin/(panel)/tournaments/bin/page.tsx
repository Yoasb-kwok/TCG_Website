"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { statusBadgeClass, statusLabel } from "@/lib/tournament-ui";

interface Registration {
  id: string;
  playerName: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

interface Tournament {
  id: string;
  title: string;
  format: string;
  maxPlayers: number;
  entryFee: number;
  prizePool: string | null;
  location: string;
  startsAt: string;
  registrationDeadline: string;
  durationMinutes: number;
  status: string;
  _count: { registrations: number };
  registrations: Registration[];
  deletedAt?: string | null;
}

export default function BinPage() {
  const [trashed, setTrashed] = useState<Tournament[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{
    ids: string[];
    all: boolean;
  } | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/tournaments/trash");
    const data = await res.json();
    setTrashed(data.tournaments ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const restoreSelected = async (ids: string[]) => {
    const res = await fetch("/api/admin/tournaments/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      load();
    }
  };

  const permanentlyDelete = async (ids: string[], all: boolean) => {
    const res = await fetch("/api/admin/tournaments/bin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { all: true } : { ids }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      setConfirmDelete(null);
      load();
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <Link
        href="/admin/tournaments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回賽事管理
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">回收站</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            已刪除的賽事。可還原或永久刪除。永久刪除後無法復原，相關報名紀錄將一併刪除。
          </p>
        </div>
      </div>

      {/* Toolbar */}
      {trashed.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                selectedIds.size > 0 && selectedIds.size === trashed.length
              }
              onChange={() => {
                if (selectedIds.size === trashed.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(trashed.map((t) => t.id)));
                }
              }}
              className="h-4 w-4"
            />
            <span className="text-sm text-muted-foreground">全選</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreSelected([...selectedIds])}
                >
                  還原 ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    setConfirmDelete({ ids: [...selectedIds], all: false })
                  }
                >
                  永久刪除 ({selectedIds.size})
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete({ ids: [], all: true })}
            >
              清空回收站
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-6 space-y-3">
        {trashed.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground/80">
            回收站是空的
          </p>
        ) : (
          trashed.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(t.id)}
                  onChange={() => toggleSelect(t.id)}
                  className="h-4 w-4 shrink-0"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{t.title}</p>
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(t.status)}
                    >
                      {statusLabel(t.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(t.startsAt)} · {t.location} · {t.format}
                    {" · "}
                    {t._count.registrations} 報名
                    {t.deletedAt ? ` · 刪除於 ${formatDate(t.deletedAt)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreSelected([t.id])}
                >
                  還原
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete({ ids: [t.id], all: false })}
                >
                  永久刪除
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 永久刪除確認 Dialog */}
      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              ⚠ 確認永久刪除
            </DialogTitle>
            <DialogDescription>
              永久刪除後將無法復原，所有相關報名紀錄將一併刪除。
            </DialogDescription>
          </DialogHeader>
          {confirmDelete && (
            <div className="space-y-3">
              {(confirmDelete.all
                ? trashed
                : trashed.filter((t) => confirmDelete.ids.includes(t.id))
              ).map((t) => {
                const isLive =
                  t.status !== "CANCELLED" && t.status !== "COMPLETED";
                return (
                  <div
                    key={t.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{t.title}</p>
                      <Badge
                        variant="secondary"
                        className={statusBadgeClass(t.status)}
                      >
                        {statusLabel(t.status)}
                      </Badge>
                    </div>
                    {t._count.registrations > 0 && (
                      <p className="mt-1 text-xs text-amber-500">
                        此賽事有 {t._count.registrations} 報名紀錄，將一併刪除
                      </p>
                    )}
                    {isLive && (
                      <p className="mt-1 text-sm font-bold text-destructive">
                        ⚠ 此賽事狀態為「
                        {statusLabel(t.status)}
                        」，仍為進行中之賽事，請確認是否真的要刪除！
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
                >
                  取消
                </Button>
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() =>
                    permanentlyDelete(confirmDelete.ids, confirmDelete.all)
                  }
                >
                  確認永久刪除
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
