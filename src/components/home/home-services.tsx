import Image from "next/image";
import Link from "next/link";
import { homeCardShadow, homeContainer } from "@/components/home/home-layout";
import type { HomeServiceCardContent } from "@/lib/home-services";

export function HomeServices({ services }: { services: HomeServiceCardContent[] }) {
  return (
    <section className={`${homeContainer} grid grid-cols-1 gap-[24px] pt-16 pb-8 lg:grid-cols-3`}>
      {services.map((service) => (
        <Link
          key={service.id}
          href={service.href}
          className={`flex flex-col overflow-hidden rounded-[12px] border border-trtcg-gold/90 bg-white/98 ${homeCardShadow} transition duration-300 hover:-translate-y-1 hover:shadow-trtcg-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trtcg-gold`}
        >
          <span className="relative block h-40 w-full bg-trtcg-lavender">
            <Image
              src={service.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 400px, 100vw"
              className="object-cover"
            />
          </span>
          <span className="flex flex-col items-start gap-4 p-8">
            <span className="text-[28px] font-medium leading-[1.4] text-trtcg-ink">{service.title}</span>
            <span className="text-[16px] leading-[1.65] text-trtcg-muted">{service.body}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
