import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroCarousel } from "@/components/layout/hero-carousel";
import { ProductCard } from "@/components/marketplace/product-card";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { DEMO_PRODUCTS, DEMO_TOURNAMENTS } from "@/lib/demo-products";

export default function HomePage() {
  const featured = DEMO_PRODUCTS.slice(0, 4);

  return (
    <>
      <HeroCarousel />

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">熱門商品</h2>
          <Link
            href="/products"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            查看全部 <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/50 py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">即將舉辦的店賽</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                每週舉辦 Pokémon 標準賽 · 現場報到
              </p>
            </div>
            <Link
              href="/tournaments"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              全部賽事 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {DEMO_TOURNAMENTS.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid gap-6 rounded-xl border border-border bg-card p-8 md:grid-cols-3">
          {[
            {
              title: "單卡買賣",
              desc: "按系列、稀有度、屬性篩選，支援 NM/LP 等品相標示",
            },
            {
              title: "封盒預訂",
              desc: "最新 Pokémon 系列封盒及補充包，香港現貨發售",
            },
            {
              title: "店賽報名",
              desc: "標準賽、新手賽 — 店內舉辦",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
