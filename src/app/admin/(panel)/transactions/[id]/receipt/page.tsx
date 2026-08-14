"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { ReceiptEmail } from "@/emails/receipt";
import { render } from "@react-email/render";
import type { ReceiptData } from "@/lib/transaction-types";

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/admin/transactions/${params.id}/receipt`,
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "無法載入收據");
          setLoading(false);
          return;
        }
        const data = await res.json();
        const rendered = await render(
          ReceiptEmail({ data: data.receiptData as ReceiptData }),
        );
        setHtml(rendered);
        setLoading(false);
      } catch {
        setError("載入收據失敗");
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">載入中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Link
          href="/admin/transactions"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回交易管理
        </Link>
        <p className="py-12 text-center text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Toolbar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回交易管理
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm text-background"
        >
          <Printer className="h-4 w-4" />
          列印收據
        </button>
      </div>

      {/* Receipt HTML */}
      <div
        className="mx-auto max-w-[580px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
