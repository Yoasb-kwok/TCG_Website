import Link from "next/link";
import { DemoCatalog } from "@/components/demo/demo-catalog";
import { demoCtaClass, demoGhostClass, demoPanelClass } from "@/components/demo/demo-look";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { DEMO_SHOP, DEMO_STORE_PATH } from "@/lib/demo-shop";
import { formatDate, formatPrice } from "@/lib/format";

export default function DemoHomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.18),transparent_52%),radial-gradient(ellipse_at_80%_0%,rgba(139,92,246,0.2),transparent_42%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:px-6">
          <p className="inline-flex max-w-full items-center rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-50 sm:text-sm">
            Pokémon TCG · 港幣 · 繁體中文
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.12]">
            {DEMO_SHOP.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            這是一間虛構示範店。可以瀏覽商品、加入購物車，並走到結帳。付款不會成立訂單。
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            {DEMO_SHOP.address.zh}
            <span className="mx-2 text-slate-600">·</span>
            {DEMO_SHOP.mtr}
            <span className="mx-2 text-slate-600">·</span>
            {DEMO_SHOP.hours}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#catalog" className={demoCtaClass}>
              瀏覽商品
            </a>
            <Link href={`${DEMO_STORE_PATH}/tournaments`} className={demoGhostClass}>
              店賽
            </Link>
          </div>
        </div>
      </section>
      <DemoCatalog />
      <section className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-300">店內賽事</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">店賽</h2>
            </div>
            <Link
              href={`${DEMO_STORE_PATH}/tournaments`}
              className="text-sm text-slate-400 hover:text-white"
            >
              全部賽事
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {DEMO_TOURNAMENTS.map((tournament) => (
              <Link
                key={tournament.id}
                href={`${DEMO_STORE_PATH}/tournaments/${tournament.slug}`}
                className={`${demoPanelClass} block p-5 transition hover:border-cyan-300/40`}
              >
                <p className="text-lg font-semibold tracking-tight text-white">{tournament.title}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {tournament.location}
                  <span className="mx-2 text-slate-600">·</span>
                  {formatDate(tournament.startsAt)}
                </p>
                <p className="mt-3 text-sm font-semibold text-cyan-200">報名費 {formatPrice(tournament.entryFee)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
