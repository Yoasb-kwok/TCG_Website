"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportError[];
}

export function CsvManager() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/export");
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "匯出失敗");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const header = res.headers.get("Content-Disposition") ?? "";
      const match = header.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = match?.[1] ?? "product-export.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯出失敗");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("請先選擇 CSV 檔案");
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import", { method: "POST", body: formData });
      const data = (await res.json()) as ImportResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "匯入失敗");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 text-pink-500" />
          <h2 className="text-lg font-semibold">匯出商品</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          下載 ZIP，解開後的 product.csv 是 UTF-8（含 BOM）。Excel 與 Google 試算表可正確顯示中文商品名稱與描述。不含圖片、帳戶、訂單或店賽資料。每個商品只匯出價格最低的一個變體。
        </p>
        <Button type="button" className="mt-4" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "匯出中..." : "下載 ZIP"}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-pink-500" />
          <h2 className="text-lg font-semibold">匯入商品 (CSV)</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          上傳 UTF-8 CSV 建立新商品（BOM 可有可無；Excel 若存成帶 BOM 的 UTF-16 也可以）。不是這兩種編碼會拒絕，不會把亂碼存進去。Excel 請另存為「CSV UTF-8」。每行一筆商品（含一個變體）。已存在的 slug 會跳過，不會覆寫描述。有填 description 時照原文儲存，空白的單卡才用系列與卡號產生描述。
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="csv-file-input" className="text-sm font-medium">
            CSV 檔
          </label>
          <input
            ref={fileRef}
            id="csv-file-input"
            type="file"
            accept=".csv,text/csv"
            className="block max-w-full text-sm"
          />
          <a
            href="/api/admin/import-template"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            下載範本
          </a>
          <Button type="button" onClick={handleImport} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "匯入中..." : "開始匯入"}
          </Button>
        </div>

        <details className="mt-4 text-sm text-muted-foreground">
          <summary className="cursor-pointer">CSV 欄位說明</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1 pr-4">欄位</th>
                  <th className="py-1 pr-4">必填</th>
                  <th className="py-1">說明</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-1 pr-4 font-mono">name</td><td className="py-1 pr-4">是</td><td className="py-1">商品名稱</td></tr>
                <tr><td className="py-1 pr-4 font-mono">type</td><td className="py-1 pr-4">是</td><td className="py-1">SINGLE / BOOSTER_PACK / SEALED_BOX / ACCESSORY</td></tr>
                <tr><td className="py-1 pr-4 font-mono">setCode</td><td className="py-1 pr-4">單卡必填</td><td className="py-1">系列編號 (M3, SV3 等)</td></tr>
                <tr><td className="py-1 pr-4 font-mono">rarityTier</td><td className="py-1 pr-4">單卡必填</td><td className="py-1">稀有度分類 (RR, SR, AR 等)</td></tr>
                <tr><td className="py-1 pr-4 font-mono">cardNumber</td><td className="py-1 pr-4">否</td><td className="py-1">卡號 (如 045)</td></tr>
                <tr><td className="py-1 pr-4 font-mono">cardSet</td><td className="py-1 pr-4">否</td><td className="py-1">卡包系列顯示名</td></tr>
                <tr><td className="py-1 pr-4 font-mono">rarity</td><td className="py-1 pr-4">否</td><td className="py-1">稀有度顯示名</td></tr>
                <tr><td className="py-1 pr-4 font-mono">cardCategory</td><td className="py-1 pr-4">否</td><td className="py-1">POKEMON / TRAINER / ITEM / ENERGY / STADIUM</td></tr>
                <tr><td className="py-1 pr-4 font-mono">pokemonType</td><td className="py-1 pr-4">否</td><td className="py-1">屬性 (草/火/水/雷 等)</td></tr>
                <tr><td className="py-1 pr-4 font-mono">condition</td><td className="py-1 pr-4">否</td><td className="py-1">品相狀態 (預設依 type)</td></tr>
                <tr><td className="py-1 pr-4 font-mono">isFoil</td><td className="py-1 pr-4">否</td><td className="py-1">true / false</td></tr>
                <tr><td className="py-1 pr-4 font-mono">price</td><td className="py-1 pr-4">是</td><td className="py-1">價格 (HKD)</td></tr>
                <tr><td className="py-1 pr-4 font-mono">stock</td><td className="py-1 pr-4">是</td><td className="py-1">庫存數量</td></tr>
                <tr><td className="py-1 pr-4 font-mono">description</td><td className="py-1 pr-4">否</td><td className="py-1">商品描述（繁中）。空白時單卡會用系列／卡號自動產生</td></tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {result ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">匯入結果</h2>
          <div className="mt-3 flex gap-6 text-sm">
            <div className="text-green-600 dark:text-green-400">
              <span className="text-2xl font-bold">{result.created}</span> 新增
            </div>
            <div className="text-yellow-600 dark:text-yellow-400">
              <span className="text-2xl font-bold">{result.skipped}</span> 跳過
            </div>
            <div className="text-red-600 dark:text-red-400">
              <span className="text-2xl font-bold">{result.errors.length}</span> 失敗
            </div>
          </div>
          {result.errors.length > 0 ? (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">錯誤明細</h3>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-4 py-2">行號</th>
                      <th className="px-4 py-2">錯誤</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((err) => (
                      <tr key={`${err.row}-${err.message}`} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-muted-foreground">{err.row}</td>
                        <td className="px-4 py-2 text-red-600 dark:text-red-400">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        範本範例：皮卡丘 / 雷 / 特別插畫, 稀有
      </p>
    </div>
  );
}
