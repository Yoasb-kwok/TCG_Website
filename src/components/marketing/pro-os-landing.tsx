"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChartColumn,
  Check,
  Clock3,
  CreditCard,
  Layers,
  Menu,
  Monitor,
  Package,
  QrCode,
  Sparkles,
  Store,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { ProOsMockup } from "@/components/marketing/pro-os-mockup";
import { ProOsRoiPanel } from "@/components/marketing/pro-os-roi-panel";
import { ProOsFaqTrial } from "@/components/marketing/pro-os-trial";
import {
  Bullet,
  HeroBadge,
  ProLogo,
  SectionHeading,
  proCtaClass,
  proGhostClass,
  proPageClass,
  proWrap,
} from "@/components/marketing/pro-os-ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#compare", label: "痛點對比" },
  { href: "#features", label: "六大功能" },
  { href: "#scoring", label: "賽事計分" },
  { href: "#roi", label: "效益試算" },
  { href: "#setup", label: "開舖流程" },
  { href: "#faq", label: "FAQ" },
] as const;

const TRUST = ["免信用卡開通", "支援 FPS / PayMe / 門市收銀", "原生支援 PTCG / 海賊王 / 符文戰場"];

const PAIN = [
  "IG 出 Post 覆 PM 到半夜：客人問單卡現貨要手動翻查，回覆慢了即時流失顧客。",
  "門市與網店經常「賣爆單」：實體店賣出了高價卡，網上忘記更新，導致線上重複下單引起爭執。",
  "比賽用紙筆手寫對戰表：瑞士輪排位算分混亂，裁判算錯勝手引致玩家不滿投訴。",
  "寄賣單卡對數極度繁瑣：幾百張客戶寄賣單卡，月底拆帳計算佣金花費大量人工。",
];

const GAIN = [
  "24 小時線上自動接單：顧客隨時於品牌網店搜尋及下單，自動支援 FPS / PayMe 即時入數。",
  "門市與網店庫存秒級同步：POS 掃碼出貨即時扣減線上庫存，徹底告別「賣空頭」風險。",
  "一鍵生成瑞士輪電子計分板：玩家手機掃 QR Code 自查對戰桌號與即時勝率，零差錯。",
  "自動計算寄賣分帳報表：系統自動記錄佣金比例，月底一鍵匯出 Excel 清晰對數表。",
];

const FEATURES = [
  {
    icon: Store,
    tint: "bg-cyan-400/10 text-cyan-300",
    title: "智慧品牌網店 (E-Commerce)",
    body: "專為 TCG 單卡設計的分類結構，支援罕貴度（SAR, SR, PSA10）、預售盒裝與福袋盲盒，顧客 24 小時自由下單。",
  },
  {
    icon: CreditCard,
    tint: "bg-blue-500/10 text-blue-300",
    title: "POS 門市收銀系統 (POS)",
    body: "電腦、iPad 或手機皆可直連條碼槍出貨。支援單卡臨時掛單、會員折扣自動套用及門市多種電子支付接駁。",
  },
  {
    icon: Package,
    tint: "bg-violet-500/10 text-violet-300",
    title: "實時庫存與寄賣管理",
    body: "門市賣出、線上即時扣數；獨家「顧客寄賣分帳模組」，自動扣除店鋪抽成佣金，每月結算一鍵輸出對數表。",
  },
  {
    icon: Users,
    tint: "bg-teal-400/10 text-teal-300",
    title: "會員積分與等級制度",
    body: "普通卡/銀卡/金卡/VIP 分級，消費自動累積積分扣減現金，配合生日月專屬優惠，鎖定牌手熟客長期回購。",
  },
  {
    icon: ChartColumn,
    tint: "bg-amber-400/10 text-amber-300",
    title: "營業報表與利潤分析",
    body: "每日毛利統計、熱銷單卡排行榜與低庫存自動預警。清晰數據面板讓店主一目了然掌握店鋪實際盈利。",
  },
  {
    icon: Layers,
    tint: "bg-fuchsia-500/10 text-fuchsia-300",
    title: "多遊戲擴充支援 (Multi-TCG)",
    body: "原生支援 PTCG 寶可夢，並可一鍵無縫擴充「符文戰場」、海賊王 ONE PIECE、遊戲王、MTG 等多款卡牌資料庫。",
    dot: true,
  },
];

const PAIRINGS = [
  { id: "T1", a: "Alan Chan (3-0)", b: "Bernard Wong (3-0)", status: "In Progress", score: "1 : 0", live: true },
  { id: "T2", a: "Chris Lee (2-1)", b: "David Cheung (2-1)", status: "Finished", score: "Chris Lee (2-0)", live: false },
  { id: "T3", a: "Eric Tang (2-1)", b: "Frankie Ho (2-1)", status: "In Progress", score: "1 : 1", live: true },
  { id: "T4", a: "Gordon Kwok (1-2)", b: "Henry Sit (1-2)", status: "In Progress", score: "0 : 1", live: true },
];

const STATS = [
  {
    value: "+35%",
    valueClass: "text-cyan-300",
    title: "月營業額平均增幅",
    body: "打破實體店營業時間限制，24 小時線上自動接收單卡訂單",
  },
  {
    value: "-70%",
    valueClass: "text-violet-300",
    title: "節省日常管理時間",
    body: "門市 POS 與網店庫存秒級自動對接，告別繁瑣手工記帳對數",
  },
  {
    value: "+50%",
    valueClass: "text-fuchsia-300",
    title: "牌手熟客回購率",
    body: "會員積分扣減與賽事電子通知，高度鎖定店舖忠誠玩家社群",
  },
];

const STEPS = [
  {
    n: "1",
    tint: "bg-cyan-400 text-[#062033]",
    title: "填表登記試用",
    body: "填寫店名與 WhatsApp 號碼，30 秒快速開通專屬 TCG 網店後台網址。",
  },
  {
    n: "2",
    tint: "bg-blue-500 text-white",
    title: "載入卡牌庫存範本",
    body: "系統內建推載 PTCG、海賊王等熱門單卡資料庫，一鍵即可匯入店鋪現貨。",
  },
  {
    n: "3",
    tint: "bg-violet-500 text-white",
    title: "即刻開工收錢",
    body: "門市 iPad/電腦直連掃碼收銀，線上網店同步接受顧客 PayMe / FPS 下單！",
  },
];

export function ProOsLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={proPageClass}>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070b14]/90 backdrop-blur-md">
        <div className={cn(proWrap, "flex items-center justify-between gap-3 py-3")}>
          <a href="#top" className="min-w-0" id="top">
            <ProLogo />
          </a>
          <nav aria-label="頁面章節" className="hidden items-center gap-5 lg:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-slate-300 transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href="#trial" className={cn(proCtaClass, "px-3.5 py-2 text-xs sm:px-4 sm:text-sm")}>
              免費試用 30 天
            </a>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full border border-white/10 text-white lg:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "關閉選單" : "開啟選單"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav aria-label="頁面章節" className="border-t border-white/8 px-4 py-3 lg:hidden">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="block rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main>
        <section className={cn(proWrap, "pt-14 pb-6 sm:pt-16")}>
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <HeroBadge>專為香港 TCG 卡店與網店而設的次世代 SaaS 營運系統</HeroBadge>
            <h1 className="mt-6 text-[1.85rem] leading-tight font-bold tracking-tight text-white sm:text-5xl lg:text-[3.15rem]">
              打破門市限制！專為香港卡店而設
              <span className="mt-1 block">的</span>
              <span className="mt-2 block bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 bg-clip-text text-transparent">
                「智慧網店與 POS 營運系統」
              </span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
              整合 24 小時自動吸客網店、POS 門市掃碼收銀、單卡與寄賣庫存秒級同步，連「瑞士輪賽事電子計分」一部電腦或手機即刻搞定！
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href="#trial" className={proCtaClass}>
                <Sparkles className="size-4" aria-hidden="true" />
                免費試用 30 天
              </a>
              <a href="#mockup" className={proGhostClass}>
                <Monitor className="size-4" aria-hidden="true" />
                即刻睇 Mockup 示範
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-300 sm:text-sm">
              {TRUST.map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <span className="grid size-4 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-12">
            <ProOsMockup />
          </div>
        </section>

        <section id="compare" className="scroll-mt-24 py-20">
          <div className={proWrap}>
            <SectionHeading
              kicker="TRADITIONAL VS. TCG-PRO OS"
              title="為什麼超過 80% 香港舊式卡店營運極度吃力？"
              subtitle="打破「手工 IG 覆訊息、紙筆算計分、庫存永遠對不上」的惡性循環"
            />
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <article className="relative rounded-[28px] border border-rose-500/25 bg-gradient-to-b from-[#1a1016] to-[#120c12] p-6 pt-8 sm:p-7">
                <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs text-rose-200 ring-1 ring-rose-400/30">
                  <X className="size-3" aria-hidden="true" />
                  傳統人工手作模式
                </span>
                <h3 className="max-w-[16rem] text-xl font-bold text-white">耗時、失誤率高、難以擴張</h3>
                <p className="mt-2 text-sm text-rose-200/70">靠人工及 Excel 硬撐，營運效率低落</p>
                <ul className="mt-6 space-y-4">
                  {PAIN.map((item) => (
                    <Bullet key={item} tone="bad">
                      {item}
                    </Bullet>
                  ))}
                </ul>
              </article>
              <article className="relative rounded-[28px] border border-cyan-400/25 bg-gradient-to-b from-[#0c1c2c] to-[#0a1422] p-6 pt-8 sm:p-7">
                <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-3 py-1 text-xs text-cyan-100 ring-1 ring-cyan-300/30">
                  <Sparkles className="size-3" aria-hidden="true" />
                  TCG-Pro OS 智慧模式
                </span>
                <h3 className="max-w-[16rem] text-xl font-bold text-white">全自動營運，業績翻倍成長</h3>
                <p className="mt-2 text-sm text-cyan-100/70">一套系統搞定線上吸客、門市收銀與賽事</p>
                <ul className="mt-6 space-y-4">
                  {GAIN.map((item) => (
                    <Bullet key={item} tone="good">
                      {item}
                    </Bullet>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 py-8 pb-20">
          <div className={proWrap}>
            <SectionHeading
              kicker="CORE FEATURE MATRIX"
              title="針對 TCG 專賣店量身訂造的 6 大核心功能"
              subtitle="全面覆蓋單卡（Singles）、密封盒裝、顧客寄賣與賽事社群"
            />
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="rounded-3xl border border-white/8 bg-[#0d1526] p-6">
                    <span className={cn("relative grid size-11 place-items-center rounded-2xl", feature.tint)}>
                      <Icon className="size-5" aria-hidden="true" />
                      {feature.dot ? (
                        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-rose-500" aria-hidden="true" />
                      ) : null}
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{feature.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="scoring" className="scroll-mt-24 py-8 pb-20">
          <div className={cn(proWrap, "grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]")}>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                <Trophy className="size-3.5" aria-hidden="true" />
                比賽報客神器
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-amber-200 sm:text-4xl">
                自動對戰排位與
                <span className="mt-1 block">瑞士輪電子計分系統</span>
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                告別傳統紙筆計算對戰表！專為 TCG 店舖賽事設計，支援瑞士輪 (Swiss-Pairing) 與單淘汰賽制，裁判無需人手算勝率。
              </p>
              <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
                <li className="flex gap-3">
                  <QrCode className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
                  玩家手機掃 QR Code 即可實時查閱對戰桌號與分組
                </li>
                <li className="flex gap-3">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
                  自動計算小分與勝率，零差錯自動產生下一輪配對
                </li>
                <li className="flex gap-3">
                  <Users className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
                  自動連結會員賽事積分，大幅提高牌手到店比賽黏著度
                </li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#0c1424] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">SWISS PAIRING SIMULATOR</p>
                  <p className="mt-1 text-lg font-semibold text-white">週五夜間 PTCG 200分大獎賽</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">現正進行: Round 2</p>
                  <p className="text-xl font-bold text-amber-300">20:37</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5">
                {PAIRINGS.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-[#10192c] px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-bold text-slate-300">
                        {row.id}
                      </span>
                      <div className="min-w-0 text-sm">
                        <p className="truncate text-white">{row.a}</p>
                        <p className="truncate text-slate-400">{row.b}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-[11px] font-medium", row.live ? "text-cyan-300" : "text-slate-400")}>
                        {row.status}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">{row.score}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <p className="inline-flex items-center gap-1.5">
                  <QrCode className="size-3.5 text-cyan-300" aria-hidden="true" />
                  玩家掃碼示範網址：
                  <span className="font-medium text-cyan-200">tcg.app/live/tour-992</span>
                </p>
                <Link href="/demo/shop/tournaments" className="text-slate-300 hover:text-white">
                  即時更新引戰桌號 →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="roi" className="scroll-mt-24 py-8 pb-20">
          <div className={proWrap}>
            <SectionHeading
              kicker="BUSINESS VALUE & ROI"
              title="用數據說話！系統為你帶來的實際收益提升"
              subtitle="即時計算採用 TCG-Pro OS 後預計節省的人工與額外營業額"
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {STATS.map((stat) => (
                <article key={stat.title} className="rounded-3xl border border-white/8 bg-[#0d1526] px-6 py-7 text-center">
                  <p className={cn("text-4xl font-bold", stat.valueClass)}>{stat.value}</p>
                  <h3 className="mt-2 text-base font-semibold text-white">{stat.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{stat.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-5">
              <ProOsRoiPanel />
            </div>
          </div>
        </section>

        <section id="setup" className="scroll-mt-24 py-8 pb-12">
          <div className={proWrap}>
            <SectionHeading
              kicker="FAST SETUP"
              title="簡單 3 步，最快當天即刻開店收錢"
              subtitle="零技術門檻，無須額外購買昂貴硬體設備"
            />
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="rounded-3xl border border-white/8 bg-[#0d1526] p-6">
                  <span className={cn("grid size-10 place-items-center rounded-full text-sm font-bold", step.tint)}>
                    {step.n}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <ProOsFaqTrial />
      </main>

      <footer className="mt-auto border-t border-white/8 bg-[#060910]">
        <div className={cn(proWrap, "flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center")}>
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <ProLogo compact />
            <span className="text-slate-400">— 香港首創卡店全功能智慧營運系統</span>
          </p>
          <p className="text-xs text-slate-500 sm:text-right">
            © 2026 TCG-Pro OS. All rights reserved. Designed for Hong Kong TCG Community.
          </p>
        </div>
      </footer>
    </div>
  );
}
