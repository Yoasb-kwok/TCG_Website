"use client";

import { useState } from "react";
import { PosShell } from "@/components/pos/pos-nav";
import { DemoWriteButton } from "@/components/demo/demo-write-button";
import { DEMO_PRODUCTS, DEMO_TOURNAMENTS } from "@/lib/demo-products";
import type { DemoPosDeskId } from "@/lib/demo-paths";
import { DEMO_ORDERS, DEMO_SHOP, DEMO_WRITE_DISCLAIMER } from "@/lib/demo-shop";
import { formatDate, formatPrice } from "@/lib/format";

const COPY: Record<DemoPosDeskId, { title: string; body: string }> = {
  receiving: {
    title: "倉存",
    body: "以下是示範庫存。進貨按鈕會被拒絕，畫面上的數量不會變。",
  },
  buyback: {
    title: "收卡",
    body: "可以填收購資料。確認之後不會新增庫存，也不會寫入收卡帳。",
  },
  pnl: {
    title: "損益表",
    body: "示範店沒有已儲存的銷售或開支，所以損益維持空白。",
  },
  orders: {
    title: "交易紀錄",
    body: "下面是寫死的示範訂單，用來看看畫面。改狀態不會寫入資料庫。",
  },
  scoreboard: {
    title: "計分板",
    body: "示範賽程只供瀏覽。計分不會同步到現場板。",
  },
};

export function DemoPosDesk({ desk }: { desk: DemoPosDeskId }) {
  const copy = COPY[desk];
  return (
    <PosShell current={desk} demo>
      <div className="h-full overflow-auto p-4">
        <h1 className="text-xl font-bold">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{DEMO_SHOP.name}</p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{copy.body}</p>
        <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200">{DEMO_WRITE_DISCLAIMER}</p>
        <div className="mt-6">{desk === "receiving" ? <Receiving /> : null}</div>
        <div className="mt-6">{desk === "buyback" ? <Buyback /> : null}</div>
        <div className="mt-6">{desk === "orders" ? <Orders /> : null}</div>
        <div className="mt-6">{desk === "pnl" ? <Pnl /> : null}</div>
        <div className="mt-6">{desk === "scoreboard" ? <Scoreboard /> : null}</div>
      </div>
    </PosShell>
  );
}

function Receiving() {
  return (
    <div className="max-w-3xl">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">商品</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">庫存</th>
              <th className="px-3 py-2 font-medium">售價</th>
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
                  <td className="px-3 py-2 font-mono text-xs">{variant.sku}</td>
                  <td className="px-3 py-2 tabular-nums">{variant.stock}</td>
                  <td className="px-3 py-2">{formatPrice(variant.price)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <DemoWriteButton label="記低進貨" payload={{ action: "receive" }} />
      </div>
    </div>
  );
}

function Buyback() {
  const [name, setName] = useState("Pikachu");
  const [price, setPrice] = useState("8");
  return (
    <form
      className="max-w-md space-y-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="block text-sm">
        卡名
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
        />
      </label>
      <label className="block text-sm">
        收購價（HKD）
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          inputMode="decimal"
          className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
        />
      </label>
      <DemoWriteButton label="確認收卡" payload={{ action: "buyback", name, price }} />
    </form>
  );
}

function Orders() {
  return (
    <div className="max-w-2xl space-y-3">
      {DEMO_ORDERS.map((order) => (
        <article key={order.id} className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{order.id}</p>
              <p className="text-sm text-muted-foreground">{order.item}</p>
              <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatPrice(order.total)}</p>
              <p className="text-xs text-muted-foreground">{order.status}</p>
            </div>
          </div>
          <div className="mt-3">
            <DemoWriteButton label="標記已出貨" payload={{ action: "ship", id: order.id }} />
          </div>
        </article>
      ))}
    </div>
  );
}

function Pnl() {
  return (
    <dl className="grid max-w-lg grid-cols-2 gap-3 text-sm">
      {[
        ["銷售額", formatPrice(0)],
        ["單量", "0"],
        ["開支", formatPrice(0)],
        ["毛利", formatPrice(0)],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border p-4">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-xl font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Scoreboard() {
  return (
    <ul className="max-w-xl space-y-3">
      {DEMO_TOURNAMENTS.map((tournament) => (
        <li key={tournament.id} className="rounded-xl border border-border p-4">
          <p className="font-medium">{tournament.title}</p>
          <p className="text-sm text-muted-foreground">
            {tournament.location} · {formatDate(tournament.startsAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
