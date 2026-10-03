import Link from "next/link";
import { cn } from "@/lib/utils";

export function PosNav({ current }: { current: "register" | "pnl" }) {
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        {item("/pos", "收銀", current === "register")}
        {item("/pos/pnl", "損益表", current === "pnl")}
      </div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        返回網店
      </Link>
    </div>
  );
}
