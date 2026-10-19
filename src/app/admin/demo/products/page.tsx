import { DemoWriteButton } from "@/components/demo/demo-write-button";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { DEMO_WRITE_DISCLAIMER } from "@/lib/demo-shop";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "示範商品" };

export default function DemoAdminProductsPage() {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">商品名單</h1>
      <p className="mt-1 text-sm text-muted-foreground">{DEMO_WRITE_DISCLAIMER}</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">商品</th>
              <th className="px-3 py-2 font-medium">系列</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">售價</th>
              <th className="px-3 py-2 font-medium">庫存</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_PRODUCTS.flatMap((product) =>
              product.variants.map((variant) => (
                <tr key={variant.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    {product.name}
                    <span className="ml-2 text-xs text-muted-foreground">{variant.condition}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{product.cardSet}</td>
                  <td className="px-3 py-2 font-mono text-xs">{variant.sku}</td>
                  <td className="px-3 py-2">{formatPrice(variant.price)}</td>
                  <td className="px-3 py-2 tabular-nums">{variant.stock}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <DemoWriteButton label="儲存庫存" payload={{ action: "update-stock" }} />
      </div>
    </div>
  );
}
