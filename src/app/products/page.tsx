import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";

export const metadata = {
  title: "商品",
};

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MarketplaceShell />
    </Suspense>
  );
}
