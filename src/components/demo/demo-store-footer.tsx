import { DEMO_SHOP } from "@/lib/demo-shop";
import { SITE_BRAND } from "@/lib/constants";

export function DemoStoreFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#070b14] py-10 text-sm text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 lg:px-6">
        <p className="text-base font-semibold tracking-tight text-white">{DEMO_SHOP.name}</p>
        <p>
          {DEMO_SHOP.address.zh}
          <span className="mx-2 text-slate-600">·</span>
          {DEMO_SHOP.address.en}
        </p>
        <p>
          {DEMO_SHOP.mtr}
          <span className="mx-2 text-slate-600">·</span>
          {DEMO_SHOP.hours}
        </p>
        <p className="pt-3 text-xs text-slate-500">示範店舖 · 由 {SITE_BRAND} 提供 · 結帳不會成立真實訂單</p>
      </div>
    </footer>
  );
}
