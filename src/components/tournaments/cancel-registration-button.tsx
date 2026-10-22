"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const quietClass = "inline-flex h-8 items-center text-sm text-muted-foreground";

export function CancelRegistrationButton({
  slug,
  onCancelled,
}: {
  slug: string;
  onCancelled?: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  if (cancelled) return null;

  const cancel = async () => {
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${encodeURIComponent(slug)}/register`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "取消報名失敗，請重試");
        return;
      }
      setCancelled(true);
      onCancelled?.();
      router.refresh();
    } catch {
      setError("網絡錯誤，請檢查連接後重試");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {confirming ? (
        <>
          <span className={quietClass}>確定取消這場報名？</span>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={cancel}
          >
            {pending ? "處理中..." : "確定取消"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setConfirming(false);
              setError("");
            }}
          >
            返回
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
          取消報名
        </Button>
      )}
      {error ? (
        <p className="basis-full text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
