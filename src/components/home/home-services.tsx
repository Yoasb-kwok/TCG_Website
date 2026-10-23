import Image from "next/image";
import Link from "next/link";
import { homeCardShadow, homeContainer } from "@/components/home/home-layout";

const SERVICES = [
  {
    href: "/products?type=SINGLE",
    title: "單卡買賣",
    body: "按系列、稀有度、屬性篩選，支援 NM/LP 等品相標示",
    icon: "/brand/home/icon-search-service.svg",
  },
  {
    href: "/products?type=SEALED_BOX",
    title: "封盒預訂",
    body: "最新 Pokémon 系列封盒及補充包，香港現貨發售",
    icon: "/brand/home/icon-bag-service.svg",
  },
  {
    href: "/tournaments",
    title: "店賽報名",
    body: "標準賽、新手賽 — 店內舉辦",
    icon: "/brand/home/icon-calendar.svg",
  },
] as const;

export function HomeServices() {
  return (
    <section className={`${homeContainer} grid grid-cols-1 gap-6 pt-16 pb-8 lg:grid-cols-3`}>
      {SERVICES.map((service) => (
        <Link
          key={service.href}
          href={service.href}
          className={`flex flex-col items-start gap-6 rounded-[12px] border border-[rgba(200,162,74,0.9)] bg-[rgba(255,255,255,0.98)] p-8 ${homeCardShadow} transition hover:border-[#c8a24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]`}
        >
          <span className="flex size-16 items-center justify-center rounded-[16px] bg-white">
            <Image src={service.icon} alt="" width={28} height={28} unoptimized />
          </span>
          <span className="text-[28px] font-medium leading-[1.4] text-[#0a0a09]">{service.title}</span>
          <span className="text-[16px] leading-[1.65] text-[#625f58]">{service.body}</span>
        </Link>
      ))}
    </section>
  );
}
