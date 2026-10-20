import { demoPanelClass } from "@/components/demo/demo-look";
import { DEMO_SHOP } from "@/lib/demo-shop";
import { SITE_BRAND } from "@/lib/constants";

export const metadata = { title: "關於示範店" };

export default function DemoAboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-300">示範店</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">關於{DEMO_SHOP.name}</h1>
      <p className="mt-4 text-sm leading-7 text-slate-300">
        {DEMO_SHOP.name}是 {SITE_BRAND} 的公開示範店，用來看看網店、商家後台同收銀怎樣一起用。地址、店主同商品都是虛構資料，價錢以港幣顯示。
      </p>
      <dl className={`${demoPanelClass} mt-6 space-y-4 p-5 text-sm`}>
        <div>
          <dt className="text-muted-foreground">地址</dt>
          <dd>{DEMO_SHOP.address.zh}</dd>
          <dd className="text-muted-foreground">{DEMO_SHOP.address.en}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">交通</dt>
          <dd>{DEMO_SHOP.mtr}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">營業時間</dt>
          <dd>{DEMO_SHOP.hours}</dd>
        </div>
      </dl>
    </div>
  );
}
