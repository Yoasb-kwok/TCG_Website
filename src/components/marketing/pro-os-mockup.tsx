"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock3, Plus, Search, Store, Trophy } from "lucide-react";
import { DEMO_ADMIN_PATH, DEMO_POS_PATH, DEMO_STORE_PATH } from "@/lib/demo-paths";
import { cn } from "@/lib/utils";

type MockTab = "pos" | "shop" | "swiss";

const TABS: { id: MockTab; label: string; icon: typeof Store }[] = [
  { id: "pos", label: "門市 POS 收銀", icon: Store },
  { id: "shop", label: "24H 品牌網店", icon: Clock3 },
  { id: "swiss", label: "瑞士輪電子榜", icon: Trophy },
];

const LIVE: Record<MockTab, { href: string; label: string }> = {
  pos: { href: DEMO_POS_PATH, label: "開啟 POS 示範" },
  shop: { href: DEMO_STORE_PATH, label: "開啟網店示範" },
  swiss: { href: `${DEMO_STORE_PATH}/tournaments`, label: "開啟賽事示範" },
};

const POS_PRODUCTS = [
  { set: "PTCG SV8S", name: "噴火龍 ex SAR", stock: "現貨: 2 張", price: "HK$ 1,280" },
  { set: "PTCG SV4a", name: "皮卡丘 SSR (色違)", stock: "現貨: 5 張", price: "HK$ 320" },
  { set: "ONE PIECE OP05", name: "蒙其·D·路飛 SEC", stock: "現貨: 1 張", price: "HK$ 580" },
];

const SHOP_PRODUCTS = [
  { tag: "現貨快取", tagClass: "text-cyan-300", title: "海賊王 OP-05 雙璧之霸 盒裝", meta: "最後 3 盒", price: "HK$ 580" },
  { tag: "高價單卡", tagClass: "text-amber-300", title: "PTCG 莉莉艾 SR (夢幻珍藏卡)", meta: "PSA 10 鑑定卡", price: "HK$ 18,500" },
  { tag: "熱門周邊", tagClass: "text-violet-300", title: "符文戰場 閃卡組合包", meta: "庫存充裕", price: "HK$ 240" },
  { tag: "客戶寄賣", tagClass: "text-emerald-300", title: "遊戲王 青眼白龍 (20th 閃卡)", meta: "寄賣品", price: "HK$ 4,200" },
];

export function ProOsMockup() {
  const [tab, setTab] = useState<MockTab>("pos");
  const live = LIVE[tab];

  return (
    <div id="mockup" className="scroll-mt-24">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1222] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="rounded-md bg-black/35 px-3 py-1 text-xs text-slate-400">
              tcg-pro-system.app/demo
            </span>
          </div>
          <div className="ml-auto flex flex-wrap gap-2" role="tablist" aria-label="產品 Mockup">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`mockup-tab-${item.id}`}
                  aria-selected={active}
                  aria-controls={`mockup-panel-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm",
                    active
                      ? "bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.45)]"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:text-white",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {tab === "pos" ? <PosPanel /> : null}
          {tab === "shop" ? <ShopPanel /> : null}
          {tab === "swiss" ? <SwissPanel /> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-4 py-3 text-xs sm:px-5">
          <p className="text-slate-500">互動畫面 · 不會寫入訂單或庫存</p>
          <Link href={live.href} className="font-medium text-sky-300 hover:text-sky-200">
            {live.label} →
          </Link>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        真實示範（樣本資料，寫入會被拒絕）：{" "}
        <Link href={DEMO_STORE_PATH} className="text-slate-300 hover:text-white">
          網店
        </Link>
        <span className="mx-1.5">·</span>
        <Link href={DEMO_POS_PATH} className="text-slate-300 hover:text-white">
          POS 收銀
        </Link>
        <span className="mx-1.5">·</span>
        <Link href={DEMO_ADMIN_PATH} className="text-slate-300 hover:text-white">
          後台
        </Link>
      </p>
    </div>
  );
}

function PosPanel() {
  return (
    <div role="tabpanel" id="mockup-panel-pos" aria-labelledby="mockup-tab-pos" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">搜尋單卡</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
          <input
            readOnly
            value="噴火龍 ex (SAR 139/108)"
            className="w-full rounded-xl border border-white/10 bg-[#070d18] py-2.5 pr-3 pl-9 text-sm text-slate-200 outline-none"
          />
        </label>
        <span className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
          條碼對應中
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.85fr)]">
        <div className="grid gap-3 sm:grid-cols-3">
          {POS_PRODUCTS.map((product) => (
            <article key={product.name} className="flex flex-col rounded-2xl border border-white/8 bg-[#10192c] p-3.5">
              <p className="text-[11px] text-slate-500">{product.set}</p>
              <h3 className="mt-1 text-sm font-semibold text-white">{product.name}</h3>
              <p className="mt-2 text-xs text-slate-400">{product.stock}</p>
              <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                <p className="text-sm font-semibold text-white">{product.price}</p>
                <span className="grid size-7 place-items-center rounded-full border border-white/15 text-slate-200">
                  <Plus className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>

        <aside className="rounded-2xl border border-white/8 bg-[#10192c] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">購物籃</p>
              <p className="text-xs text-slate-400">單號 #POS-8842</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              會員: 金卡會員 (Ken)
            </span>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-white">噴火龍 ex SAR x1</span>
                <span className="text-xs text-slate-500">寄賣賣家: CardCollectorHK</span>
              </span>
              <span className="shrink-0 text-slate-200">HK$ 1,280</span>
            </li>
            <li className="flex items-center justify-between gap-3 text-slate-200">
              <span>專用磨砂卡套 (64枚) x2</span>
              <span>HK$ 110</span>
            </li>
            <li className="flex items-center justify-between gap-3 text-rose-300">
              <span>會員 95 折優惠</span>
              <span>- HK$ 69.5</span>
            </li>
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm text-slate-300">應付總額</span>
            <span className="text-lg font-bold text-white">HK$ 1,320.5</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <span className="rounded-lg bg-sky-500/20 py-2 text-sky-100">FPS 轉數快</span>
            <span className="rounded-lg bg-blue-600/40 py-2 text-blue-50">PayMe</span>
            <span className="rounded-lg bg-white/10 py-2 text-slate-200">現金結帳</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ShopPanel() {
  return (
    <div role="tabpanel" id="mockup-panel-shop" aria-labelledby="mockup-tab-shop" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-cyan-400/15 px-2 py-1 text-[11px] font-bold tracking-wide text-cyan-200">
            TCG
          </span>
          <div>
            <p className="text-sm font-semibold text-white">香港首創 · 24H 單卡即時搜尋網店</p>
            <p className="mt-0.5 text-xs text-slate-400">門市與網店庫存 100% 秒級同步，無需人工改數</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">
          網店下單自動同步 POS 庫存
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SHOP_PRODUCTS.map((product) => (
          <article key={product.title} className="flex flex-col rounded-2xl border border-white/8 bg-[#10192c] p-4">
            <p className={cn("text-[11px] font-medium", product.tagClass)}>{product.tag}</p>
            <h3 className="mt-2 text-sm font-semibold leading-6 text-white">{product.title}</h3>
            <p className="mt-1 text-xs text-slate-400">{product.meta}</p>
            <p className="mt-4 text-base font-bold text-white">{product.price}</p>
            <span className="mt-3 block rounded-lg bg-white/8 py-2 text-center text-xs font-medium text-slate-200">
              加入購物車
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function SwissPanel() {
  const tables = [
    {
      id: "桌號 #1",
      players: ["Alan Chan (3-0)", "Bernard Wong (3-0)"],
      status: "In Progress",
      result: "1 - 0",
    },
    {
      id: "桌號 #2",
      players: ["Chris Lee (2-1)", "David Cheung (2-1)"],
      status: "Finished",
      result: "Chris Lee (2-0)",
    },
  ];

  return (
    <div role="tabpanel" id="mockup-panel-swiss" aria-labelledby="mockup-tab-swiss" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
            <Trophy className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">2026 PTCG 香港店舖對抗賽 (瑞士輪 Round 2/4)</p>
            <p className="mt-0.5 text-xs text-slate-400">玩家手機掃 QR Code 即可實時查閱對戰與個人分數</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500">剩餘對戰時間</p>
          <p className="mt-1 inline-flex rounded-lg bg-blue-600 px-2.5 py-1 text-sm font-bold text-white">21:24</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {tables.map((table) => (
          <article key={table.id} className="rounded-2xl border border-white/8 bg-[#10192c] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">{table.id}</p>
                {table.players.map((player) => (
                  <p key={player} className="mt-1 text-sm text-white">
                    {player}
                  </p>
                ))}
              </div>
              <div className="text-right">
                <p className={cn("text-xs font-medium", table.status === "In Progress" ? "text-cyan-300" : "text-slate-400")}>
                  {table.status}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{table.result}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
