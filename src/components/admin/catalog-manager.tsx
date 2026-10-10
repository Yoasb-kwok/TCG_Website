"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogCardDto, CatalogChangelogDto } from "@/lib/catalog-query";

interface ImportResult {
  sets: Array<{
    setCode: string;
    created: number;
    updated: number;
    unchanged: number;
    pendingTranslation: number;
    note: string;
  }>;
  warnings: string[];
}

export function CatalogManager() {
  const [file, setFile] = useState<File | null>(null);
  const [setCode, setSetCode] = useState("");
  const [note, setNote] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [entries, setEntries] = useState<CatalogChangelogDto[]>([]);
  const [search, setSearch] = useState("");
  const [filterSet, setFilterSet] = useState("");
  const [cards, setCards] = useState<CatalogCardDto[]>([]);
  const [cardTotal, setCardTotal] = useState(0);

  const loadChangelog = useCallback(() => {
    fetch("/api/catalog/changelog?limit=20")
      .then((response) => response.json())
      .then((data: { entries?: CatalogChangelogDto[]; error?: string }) => {
        setEntries(data.entries ?? []);
      })
      .catch(() => setEntries([]));
  }, []);

  const loadCards = useCallback((query: string, set: string) => {
    const params = new URLSearchParams({ pageSize: "30" });
    if (query.trim()) params.set("q", query.trim());
    if (set.trim()) params.set("set", set.trim());
    fetch(`/api/cards?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { cards?: CatalogCardDto[]; total?: number }) => {
        setCards(data.cards ?? []);
        setCardTotal(data.total ?? 0);
      })
      .catch(() => {
        setCards([]);
        setCardTotal(0);
      });
  }, []);

  useEffect(() => {
    loadChangelog();
    loadCards("", "");
  }, [loadChangelog, loadCards]);

  const onImport = async () => {
    if (!file) {
      setError("請選擇 CSV 檔");
      return;
    }
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (setCode.trim()) form.set("setCode", setCode.trim());
      if (note.trim()) form.set("note", note.trim());
      const response = await fetch("/api/admin/catalog/import", { method: "POST", body: form });
      const data = (await response.json()) as ImportResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "匯入失敗");
        return;
      }
      setResult(data);
      loadChangelog();
      loadCards(search, filterSet || data.sets[0]?.setCode || "");
      if (!filterSet && data.sets[0]?.setCode) setFilterSet(data.sets[0].setCode);
    } catch {
      setError("匯入失敗");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">匯入官方卡表</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          用 Excel 另存「CSV UTF-8」再上傳。程式會去掉 BOM。收集編號請設成文字，避免 001/076 被 Excel 變成日期。
          沒有繁中名稱的列會標成「待補」。已有的譯名不會被空白列蓋掉。CSV 沒有的卡不會刪除。
        </p>
        <p className="mt-2 text-sm">
          <a className="text-pink-400 underline" href="/api/catalog/template">
            下載 CSV 範本
          </a>
          <span className="text-muted-foreground">
            {" "}
            · 欄位說明見 docs/catalog-import.md。系列代碼照官方原文，例如 M6、M6a。
          </span>
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="catalog-file">CSV 檔</Label>
            <input
              id="catalog-file"
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-set">系列代碼（CSV 沒有 setCode 欄時才需要）</Label>
            <Input
              id="catalog-set"
              value={setCode}
              onValueChange={setSetCode}
              placeholder="M6"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="catalog-note">更新說明（可留空）</Label>
            <Input
              id="catalog-note"
              value={note}
              onValueChange={setNote}
              placeholder="例如：老闆提供的 M6 官方表"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button type="button" disabled={importing} onClick={onImport}>
            {importing ? "匯入中…" : "匯入"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        {result ? (
          <div className="mt-4 space-y-2 text-sm">
            {result.sets.map((set) => (
              <p key={set.setCode}>{set.note}</p>
            ))}
            {result.warnings.map((warning) => (
              <p key={warning} className="text-muted-foreground">
                {warning}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">最近更新</h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">還沒有卡表更新紀錄。</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {entries.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <p className="font-medium">
                  {entry.setCode}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {entry.date.slice(0, 16).replace("T", " ")} UTC
                  </span>
                </p>
                <p className="mt-1 text-muted-foreground">{entry.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">卡表搜尋</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          這裡查的是卡表，不是商品 SKU。上架單卡時仍在商品名單填價格、庫存和條碼。
        </p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            loadCards(search, filterSet);
          }}
        >
          <Input
            value={filterSet}
            onValueChange={setFilterSet}
            placeholder="系列，例如 M6"
            className="w-36"
          />
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="名稱或卡號"
            className="min-w-48 flex-1"
          />
          <Button type="submit" variant="outline">
            搜尋
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">{cardTotal} 張</p>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">系列</th>
                <th className="px-3 py-2 font-medium">卡號</th>
                <th className="px-3 py-2 font-medium">繁中</th>
                <th className="px-3 py-2 font-medium">日文</th>
                <th className="px-3 py-2 font-medium">稀有度</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{card.setCode}</td>
                  <td className="px-3 py-2">
                    {card.collectorNumber}
                    {card.altCollectorNumber ? (
                      <span className="block text-xs text-muted-foreground">
                        另一編號 {card.altCollectorNumber}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {card.nameZhTw}
                    {card.pendingTranslation ? (
                      <span className="ml-2 text-xs text-pink-400">待補</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{card.nameJa ?? "—"}</td>
                  <td className="px-3 py-2">{card.rarity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
