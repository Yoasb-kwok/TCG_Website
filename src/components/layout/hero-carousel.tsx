"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeBannerItem } from "@/lib/site-content";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  banners: HomeBannerItem[];
}

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const bannerCount = banners.length;
  const hasMultiple = bannerCount > 1;

  useEffect(() => {
    if (!hasMultiple) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % bannerCount);
    }, 6000);
    return () => clearInterval(timer);
  }, [bannerCount, hasMultiple]);

  if (!bannerCount) return null;
  const banner = banners[index % bannerCount];

  const goTo = (next: number) => {
    setIndex((next + bannerCount) % bannerCount);
  };

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <Link href={banner.href} className="relative block aspect-[21/9] w-full sm:aspect-[21/7]">
        <Image
          src={banner.image}
          alt={banner.title}
          fill
          className="object-cover object-center transition-opacity duration-500"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:pr-24 lg:pl-24">
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
            {banner.title}
          </h2>
          <p className="mt-2 text-sm text-white/80 md:text-lg">
            {banner.subtitle}
          </p>
        </div>
      </Link>

      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="上一張 Banner"
            onClick={() => goTo(index - 1)}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80 md:left-4 md:h-11 md:w-11"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="下一張 Banner"
            onClick={() => goTo(index + 1)}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80 md:right-4 md:h-11 md:w-11"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 張 Banner`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index
                    ? "w-8 bg-white"
                    : "w-2 bg-white/40 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
