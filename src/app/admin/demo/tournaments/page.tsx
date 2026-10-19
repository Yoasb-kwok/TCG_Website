import { DemoWriteButton } from "@/components/demo/demo-write-button";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { DEMO_WRITE_DISCLAIMER } from "@/lib/demo-shop";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata = { title: "示範店賽" };

export default function DemoAdminTournamentsPage() {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">店賽報名</h1>
      <p className="mt-1 text-sm text-muted-foreground">{DEMO_WRITE_DISCLAIMER}</p>
      <ul className="mt-6 max-w-2xl space-y-3">
        {DEMO_TOURNAMENTS.map((tournament) => (
          <li key={tournament.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">{tournament.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tournament.location} · {formatDate(tournament.startsAt)} · {formatPrice(tournament.entryFee)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              已報名 {tournament.registeredCount} / {tournament.maxPlayers}
            </p>
            <div className="mt-3">
              <DemoWriteButton label="關閉報名" payload={{ action: "close-tournament", slug: tournament.slug }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
