"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateCardNumberRange } from "@/lib/card-number-format";
import {
  Check,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaxonomy } from "@/providers/taxonomy-provider";
import type { TaxonomyOptionDto } from "@/lib/taxonomy-types";
import {
  ALL_TAXONOMY_KINDS,
  TAXONOMY_KIND_META,
  type TaxonomyKind,
} from "@/lib/taxonomy-types";
import {
  FORM_FIELD_INPUT_CLASS,
  SEARCH_BAR_SELECT_CLASS,
} from "@/lib/search-bar-styles";
import { cn } from "@/lib/utils";

interface TaxonomyManagerProps {
  variant?: "sidebar" | "page";
}

/** 編輯列表單欄 colspan（不含排序、狀態、操作） */
function editFormColSpan(kind: TaxonomyKind): number {
  if (kind === "CARD_NUMBER" || kind === "SET_CODE") return 3;
  return 2;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs",
        active
          ? "bg-green-500/15 text-green-600 dark:text-green-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      {active ? "啟用" : "停用"}
    </span>
  );
}

export function TaxonomyManager({ variant = "page" }: TaxonomyManagerProps) {
  const { grouped, loading, error, refresh, optionsFor } = useTaxonomy();
  const activeSetOptions = optionsFor("SET_CODE");
  const [activeKind, setActiveKind] = useState<TaxonomyKind>("SET_CODE");
  const [parentSetCode, setParentSetCode] = useState("");
  const [cardSuffix, setCardSuffix] = useState("");
  const [minNum, setMinNum] = useState("1");
  const [maxNum, setMaxNum] = useState("");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [newSetCardSuffix, setNewSetCardSuffix] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editParent, setEditParent] = useState("");
  const [editCardSuffix, setEditCardSuffix] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parentSelectRef = useRef<HTMLSelectElement>(null);
  const minNumInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const selectedSet = useMemo(
    () => grouped.SET_CODE.find((s) => s.value === parentSetCode),
    [grouped.SET_CODE, parentSetCode],
  );

  useEffect(() => {
    if (activeKind !== "CARD_NUMBER" || !parentSetCode) return;
    setCardSuffix(selectedSet?.cardSuffix ?? "");
  }, [activeKind, parentSetCode, selectedSet?.cardSuffix]);

  const batchPreview = useMemo(() => {
    const suffix = cardSuffix.replace(/^\//, "").trim();
    if (!suffix || !minNum.trim() || !maxNum.trim()) return null;
    const min = Number(minNum);
    const max = Number(maxNum);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max)
      return null;
    const items = generateCardNumberRange(min, max, suffix);
    if (items.length === 0) return null;
    return {
      count: items.length,
      first: items[0].value,
      last: items[items.length - 1].value,
    };
  }, [cardSuffix, minNum, maxNum]);

  /** 新增成功後聚焦第一格待填欄位（非剛按 Enter 的那格） */
  const focusFirstAddField = useCallback(() => {
    requestAnimationFrame(() => {
      if (activeKind === "CARD_NUMBER" && !parentSetCode) {
        parentSelectRef.current?.focus();
        return;
      }
      if (activeKind === "CARD_NUMBER") {
        minNumInputRef.current?.focus();
        minNumInputRef.current?.select();
        return;
      }
      valueInputRef.current?.focus();
      valueInputRef.current?.select();
    });
  }, [activeKind, parentSetCode]);

  const items = useMemo(() => {
    let list = [...(grouped[activeKind] ?? [])].sort(
      (a, b) => a.sortIndex - b.sortIndex,
    );
    if (activeKind === "CARD_NUMBER") {
      if (!parentSetCode) return [];
      list = list.filter((o) => o.parentValue === parentSetCode);
    }
    return list;
  }, [activeKind, parentSetCode, grouped]);

  const meta = TAXONOMY_KIND_META[activeKind];
  const isPage = variant === "page";

  const resetForm = () => {
    setValue("");
    setLabel("");
    setNewSetCardSuffix("");
    setMinNum("1");
    setMaxNum("");
    setLocalError(null);
    setSuccess(null);
  };

  const startEdit = (item: TaxonomyOptionDto) => {
    setEditingId(item.id);
    setEditValue(item.value);
    setEditLabel(item.label);
    setEditParent(item.parentValue ?? "");
    setEditCardSuffix(item.cardSuffix ?? "");
    setLocalError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
    setEditLabel("");
    setEditParent("");
    setEditCardSuffix("");
  };

  const handleBatchGenerate = async () => {
    if (!parentSetCode) {
      setLocalError("請先選擇系列");
      parentSelectRef.current?.focus();
      return;
    }
    const suffix = cardSuffix.replace(/^\//, "").trim();
    if (!suffix) {
      setLocalError("請填寫固定編號（/ 後面的數字，如 063）");
      return;
    }
    const min = Number(minNum);
    const max = Number(maxNum);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      setLocalError("請填寫有效的最小與最大編號");
      minNumInputRef.current?.focus();
      return;
    }
    setBusy(true);
    setLocalError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/taxonomy/batch-card-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setCode: parentSetCode,
          suffix,
          min,
          max,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        created?: number;
        skipped?: number;
        total?: number;
      };
      if (!res.ok) throw new Error(data.error ?? "批次產生失敗");
      setSuccess(
        `已產生 ${data.created ?? 0} 筆` +
          (data.skipped ? `（略過 ${data.skipped} 筆已存在）` : ""),
      );
      await refresh();
      focusFirstAddField();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "批次產生失敗");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    if (activeKind === "CARD_NUMBER" && !parentSetCode) {
      setLocalError("卡號需先選擇所屬系列");
      focusFirstAddField();
      return;
    }
    if (!value.trim()) {
      setLocalError("請填寫代碼");
      valueInputRef.current?.focus();
      return;
    }
    if (!label.trim()) {
      setLocalError("請填寫顯示標籤");
      labelInputRef.current?.focus();
      return;
    }
    setBusy(true);
    setLocalError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: activeKind,
          value: value.trim(),
          label: label.trim(),
          parentValue: activeKind === "CARD_NUMBER" ? parentSetCode : undefined,
          cardSuffix:
            activeKind === "SET_CODE"
              ? newSetCardSuffix.trim() || null
              : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "新增失敗");
      resetForm();
      setSuccess("已新增");
      await refresh();
      focusFirstAddField();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.trim() || !editLabel.trim()) {
      setLocalError("請填寫代碼與顯示標籤");
      return;
    }
    if (activeKind === "CARD_NUMBER" && !editParent) {
      setLocalError("卡號需指定所屬系列");
      return;
    }
    setBusy(true);
    setLocalError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/taxonomy/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: editValue.trim(),
          label: editLabel.trim(),
          ...(activeKind === "CARD_NUMBER" ? { parentValue: editParent } : {}),
          ...(activeKind === "SET_CODE"
            ? { cardSuffix: editCardSuffix.trim() || null }
            : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "更新失敗");
      cancelEdit();
      setSuccess("已儲存");
      await refresh();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定刪除此標籤？")) return;
    setBusy(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/admin/taxonomy/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "刪除失敗");
      if (editingId === id) cancelEdit();
      setSuccess("已刪除");
      await refresh();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (item: TaxonomyOptionDto) => {
    setBusy(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/admin/taxonomy/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "更新失敗");
      await refresh();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  };

  const applyReorder = async (orderedIds: string[]) => {
    setBusy(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/admin/taxonomy/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: activeKind,
          orderedIds,
          parentValue:
            activeKind === "CARD_NUMBER" ? parentSetCode || null : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "排序失敗");
      await refresh();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "排序失敗");
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const orderedIds = items.map((i) => i.id);
    [orderedIds[index], orderedIds[next]] = [
      orderedIds[next],
      orderedIds[index],
    ];
    await applyReorder(orderedIds);
  };

  const moveToTop = async (index: number) => {
    if (index <= 0) return;
    const id = items[index].id;
    const orderedIds = [
      id,
      ...items.filter((_, i) => i !== index).map((i) => i.id),
    ];
    await applyReorder(orderedIds);
  };

  const moveToBottom = async (index: number) => {
    if (index >= items.length - 1) return;
    const id = items[index].id;
    const orderedIds = [
      ...items.filter((_, i) => i !== index).map((i) => i.id),
      id,
    ];
    await applyReorder(orderedIds);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        isPage ? "p-6" : "sticky top-8 p-4",
      )}
    >
      {!isPage && (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Tags className="h-4 w-4 text-pink-400" />
            標籤管理
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            管理系列、稀有度、卡號、類型、屬性、商品類型
          </p>
        </>
      )}

      <div className={cn("flex flex-wrap gap-2", isPage ? "mt-0" : "mt-3")}>
        {ALL_TAXONOMY_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => {
              setActiveKind(kind);
              resetForm();
              cancelEdit();
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition",
              activeKind === kind
                ? "bg-pink-500/20 text-foreground ring-1 ring-pink-500/30"
                : "bg-muted/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {TAXONOMY_KIND_META[kind].label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "mt-6 grid gap-6",
          isPage ? "lg:grid-cols-[minmax(0,320px)_1fr]" : "grid-cols-1",
        )}
      >
        {activeKind === "CARD_NUMBER" ? (
          <form
            className="space-y-3 rounded-lg border border-border bg-background/40 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleBatchGenerate();
            }}
          >
            <h3 className="text-sm font-medium text-foreground">
              批次產生卡號
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              每個系列固定「/」後面的數字（如
              063）。輸入最小～最大編號，系統自動產生 001/063～092/063。
            </p>

            <div>
              <Label className="text-xs text-muted-foreground">
                所屬系列 *
              </Label>
              <select
                ref={parentSelectRef}
                value={parentSetCode}
                onChange={(e) => setParentSetCode(e.target.value)}
                className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
              >
                <option value="">請選擇系列</option>
                {activeSetOptions.map((s) => (
                  <option key={s.id} value={s.value}>
                    {s.label}
                    {s.cardSuffix ? ` · /${s.cardSuffix}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                固定編號（/ 後面）*
              </Label>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  value={cardSuffix}
                  onChange={(e) =>
                    setCardSuffix(e.target.value.replace(/^\//, ""))
                  }
                  placeholder="063"
                  className={cn("flex-1", FORM_FIELD_INPUT_CLASS)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">
                  最小編號 *
                </Label>
                <Input
                  ref={minNumInputRef}
                  type="number"
                  min={0}
                  value={minNum}
                  onChange={(e) => setMinNum(e.target.value)}
                  placeholder="1"
                  className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  最大編號 *
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={maxNum}
                  onChange={(e) => setMaxNum(e.target.value)}
                  placeholder="92"
                  className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
                />
              </div>
            </div>

            {batchPreview && (
              <p className="rounded-md bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground">
                預覽 {batchPreview.count} 筆：{batchPreview.first}
                {batchPreview.count > 1 ? ` … ${batchPreview.last}` : ""}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={busy || !parentSetCode}
            >
              <Plus className="mr-2 h-4 w-4" />
              批次產生
            </Button>
            <p className="text-[10px] text-muted-foreground">
              已存在的卡號會自動略過；固定編號會儲存到該系列
            </p>
          </form>
        ) : (
          <form
            className="space-y-3 rounded-lg border border-border bg-background/40 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAdd();
            }}
          >
            <h3 className="text-sm font-medium text-foreground">
              新增{TAXONOMY_KIND_META[activeKind].label}
            </h3>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">代碼 *</Label>
                <Input
                  ref={valueInputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={meta.valueHint}
                  className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  顯示標籤 *
                </Label>
                <Input
                  ref={labelInputRef}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={meta.labelHint}
                  className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
                />
              </div>
            </div>

            {activeKind === "SET_CODE" && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  卡號固定後綴（選填）
                </Label>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input
                    value={newSetCardSuffix}
                    onChange={(e) =>
                      setNewSetCardSuffix(e.target.value.replace(/^\//, ""))
                    }
                    placeholder="063"
                    className={cn("flex-1", FORM_FIELD_INPUT_CLASS)}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={busy}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增
            </Button>
            <p className="text-[10px] text-muted-foreground">
              在欄位內按 Enter 可快速新增
            </p>
          </form>
        )}

        <div className="min-w-0">
          {activeKind === "CARD_NUMBER" && (
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground">篩選系列</Label>
              <select
                value={parentSetCode}
                onChange={(e) => {
                  setParentSetCode(e.target.value);
                  cancelEdit();
                }}
                className={cn("mt-1 w-full max-w-xs", SEARCH_BAR_SELECT_CLASS)}
              >
                <option value="">請選擇系列以查看卡號</option>
                {activeSetOptions.map((s) => (
                  <option key={s.id} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(error || localError) && (
            <p className="mb-2 text-sm text-red-400">{localError ?? error}</p>
          )}
          {success && <p className="mb-2 text-sm text-green-400">{success}</p>}

          <div
            className={cn(
              "overflow-x-auto rounded-lg border border-border",
              isPage
                ? "max-h-[calc(100vh-320px)] overflow-y-auto"
                : "max-h-96 overflow-y-auto",
            )}
          >
            {loading && (
              <p className="p-4 text-sm text-muted-foreground">載入中…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                {activeKind === "CARD_NUMBER" && !parentSetCode
                  ? "請先選擇系列"
                  : "尚無標籤，請左側新增"}
              </p>
            )}
            {!loading && items.length > 0 && (
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">排序</th>
                    <th className="px-3 py-2 font-medium">顯示標籤</th>
                    <th className="px-3 py-2 font-medium">代碼</th>
                    {activeKind === "SET_CODE" && (
                      <th className="px-3 py-2 font-medium">卡號後綴</th>
                    )}
                    {activeKind === "CARD_NUMBER" && (
                      <th className="px-3 py-2 font-medium">系列</th>
                    )}
                    <th className="px-3 py-2 font-medium">狀態</th>
                    <th className="px-3 py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-t border-border/60 hover:bg-muted/30"
                    >
                      {editingId === item.id ? (
                        <>
                          <td className="px-3 py-2 text-muted-foreground">
                            {index + 1}
                          </td>
                          <td
                            className="px-3 py-2"
                            colSpan={editFormColSpan(activeKind)}
                          >
                            <form
                              className="flex flex-wrap items-end gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void handleUpdate(item.id);
                              }}
                            >
                              <div className="min-w-[100px] flex-1">
                                <Input
                                  value={editLabel}
                                  onChange={(e) => setEditLabel(e.target.value)}
                                  placeholder="顯示標籤"
                                  className={FORM_FIELD_INPUT_CLASS}
                                />
                              </div>
                              <div className="min-w-[80px] flex-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  placeholder="代碼"
                                  className={FORM_FIELD_INPUT_CLASS}
                                />
                              </div>
                              {activeKind === "SET_CODE" && (
                                <div className="flex min-w-[88px] flex-1 items-center gap-1">
                                  <span className="text-sm text-muted-foreground">
                                    /
                                  </span>
                                  <Input
                                    value={editCardSuffix}
                                    onChange={(e) =>
                                      setEditCardSuffix(
                                        e.target.value.replace(/^\//, ""),
                                      )
                                    }
                                    placeholder="063"
                                    className={FORM_FIELD_INPUT_CLASS}
                                  />
                                </div>
                              )}
                              {activeKind === "CARD_NUMBER" && (
                                <select
                                  value={editParent}
                                  onChange={(e) =>
                                    setEditParent(e.target.value)
                                  }
                                  className={cn(
                                    "min-w-[100px] flex-1",
                                    SEARCH_BAR_SELECT_CLASS,
                                  )}
                                >
                                  {activeSetOptions.map((s) => (
                                    <option key={s.id} value={s.value}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <Button
                                type="submit"
                                size="sm"
                                disabled={busy}
                                className="bg-primary text-primary-foreground"
                                title="儲存 (Enter)"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </form>
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge active={item.active} />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleActive(item)}
                                className={cn(
                                  "rounded p-1.5",
                                  item.active
                                    ? "text-green-600 hover:bg-green-500/10 dark:text-green-400"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                aria-label={item.active ? "停用" : "啟用"}
                                title={
                                  item.active ? "停用（隱藏）" : "啟用（顯示）"
                                }
                              >
                                {item.active ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={busy || index === 0}
                                onClick={() => moveToTop(index)}
                                className="rounded p-0.5 text-pink-400 hover:bg-pink-500/10 disabled:opacity-30"
                                aria-label="移到最頂"
                                title="移到最頂"
                              >
                                <ChevronsUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busy || index === 0}
                                onClick={() => move(index, -1)}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                aria-label="上移"
                                title="上移"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busy || index === items.length - 1}
                                onClick={() => move(index, 1)}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                aria-label="下移"
                                title="下移"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busy || index === items.length - 1}
                                onClick={() => moveToBottom(index)}
                                className="rounded p-0.5 text-pink-400 hover:bg-pink-500/10 disabled:opacity-30"
                                aria-label="移到最底"
                                title="移到最底"
                              >
                                <ChevronsDown className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">
                            {item.label}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.value}
                          </td>
                          {activeKind === "SET_CODE" && (
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.cardSuffix ? `/${item.cardSuffix}` : "—"}
                            </td>
                          )}
                          {activeKind === "CARD_NUMBER" && (
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.parentValue ?? "—"}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <StatusBadge active={item.active} />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleActive(item)}
                                className={cn(
                                  "rounded p-1.5",
                                  item.active
                                    ? "text-green-600 hover:bg-green-500/10 dark:text-green-400"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                aria-label={item.active ? "停用" : "啟用"}
                                title={
                                  item.active ? "停用（隱藏）" : "啟用（顯示）"
                                }
                              >
                                {item.active ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => startEdit(item)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="編輯"
                                title="編輯"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDelete(item.id)}
                                className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                                aria-label="刪除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
