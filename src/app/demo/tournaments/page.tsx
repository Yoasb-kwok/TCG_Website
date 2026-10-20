import Link from "next/link";
import { demoPanelClass } from "@/components/demo/demo-look";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { DEMO_SHOP, DEMO_STORE_PATH } from "@/lib/demo-shop";
import { formatDate, formatPrice } from "@/lib/format";
import { registrationClosedLabel } from "@/lib/registration-input";

export const metadata = { title: "示範店賽" };

export default function DemoTournamentsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-300">店內賽事</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">店賽</h1>
      <p className="mt-3 text-sm text-slate-400">{DEMO_SHOP.name} 的固定示範賽程。</p>
      <ul className="mt-6 space-y-4">
        {DEMO_TOURNAMENTS.map((tournament) => {
          const closed = registrationClosedLabel(tournament);
          return (
            <li key={tournament.id}>
              <Link
                href={`${DEMO_STORE_PATH}/tournaments/${tournament.slug}`}
                className={`${demoPanelClass} block p-5 transition hover:border-cyan-300/40`}
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
