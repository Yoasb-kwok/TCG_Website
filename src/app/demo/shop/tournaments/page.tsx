import Link from "next/link";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { DEMO_SHOP, DEMO_STORE_PATH } from "@/lib/demo-shop";
import { formatDate, formatPrice } from "@/lib/format";
import { registrationClosedLabel } from "@/lib/registration-input";

export const metadata = { title: "示範店賽" };

export default function DemoTournamentsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
      <h1 className="text-2xl font-bold">店賽</h1>
      <p className="mt-2 text-sm text-muted-foreground">{DEMO_SHOP.name} 的固定示範賽程。</p>
      <ul className="mt-6 space-y-4">
        {DEMO_TOURNAMENTS.map((tournament) => {
          const closed = registrationClosedLabel(tournament);
          return (
            <li key={tournament.id}>
              <Link
                href={`${DEMO_STORE_PATH}/tournaments/${tournament.slug}`}
                className="block rounded-xl border border-border p-5 hover:border-foreground/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{tournament.title}</h2>
                  <span className="text-xs text-muted-foreground">{closed ?? "報名中"}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tournament.description}</p>
                <p className="mt-2 text-sm">
                  {tournament.location} · {formatDate(tournament.startsAt)} · {formatPrice(tournament.entryFee)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
