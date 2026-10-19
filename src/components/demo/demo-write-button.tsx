"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_WRITE_DISCLAIMER } from "@/lib/demo-shop";

export function DemoWriteButton({
  label,
  payload,
}: {
  label: string;
  payload?: Record<string, unknown>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/demo/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? { action: label }),
      });
      const data = (await res.json()) as { error?: string };
      setMessage(data.error || DEMO_WRITE_DISCLAIMER);
    } catch {
      setMessage(DEMO_WRITE_DISCLAIMER);
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <Button type="button" variant="outline" disabled={pending} onClick={() => void submit()}>
        {pending ? "處理中…" : label}
      </Button>
      {message && (
        <p role="alert" className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          {message}
        </p>
      )}
    </div>
  );
}
