import { DEMO_SHOP } from "@/lib/demo-shop";
import { SITE_BRAND } from "@/lib/constants";

export function DemoStoreFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 lg:px-6">
        <p className="font-medium text-foreground">{DEMO_SHOP.name}</p>
        <p>
          {DEMO_SHOP.address.zh}
          <span className="mx-2">·</span>
          {DEMO_SHOP.address.en}
        </p>
        <p>
          {DEMO_SHOP.mtr}
          <span className="mx-2">·</span>
          {DEMO_SHOP.hours}
        </p>
        <p className="pt-2 text-xs">示範店舖 · 由 {SITE_BRAND} 提供</p>
      </div>
    </footer>
  );
}
