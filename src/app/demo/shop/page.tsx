import Link from "next/link";
import { DemoCatalog } from "@/components/demo/demo-catalog";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { DEMO_SHOP, DEMO_STORE_PATH } from "@/lib/demo-shop";
import { formatDate, formatPrice } from "@/lib/format";

export default function DemoHomePage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
          <p className="text-sm font-medium text-pink-500">Pokémon TCG · 港幣 · 繁體中文</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{DEMO_SHOP.name}</h1>
          <p className="mt-2 text-muted-foreground">{DEMO_SHOP.address.zh}</p>
          <p className="text-sm text-muted-foreground">
            {DEMO_SHOP.mtr}
            <span className="mx-2">·</span>
            {DEMO_SHOP.hours}
          </p>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            這是一間虛構示範店。可以瀏覽商品、加入購物車，並走到結帳。付款不會成立訂單。
          </p>
        </div>
      </section>
      <DemoCatalog />
      <section className="border-t border-border bg-muted/40 py-10">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">店賽</h2>
            <Link href={`${DEMO_STORE_PATH}/tournaments`} className="text-sm text-muted-foreground hover:text-foreground">
              全部賽事
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {DEMO_TOURNAMENTS.map((tournament) => (
              <Link
                key={tournament.id}
                href={`${DEMO_STORE_PATH}/tournaments/${tournament.slug}`}
                className="rounded-xl border border-border bg-card p-5 hover:border-foreground/20"
              >
                <p className="font-semibold">{tournament.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tournament.location} · {formatDate(tournament.startsAt)}
                </p>
                <p className="mt-2 text-sm">報名費 {formatPrice(tournament.entryFee)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
