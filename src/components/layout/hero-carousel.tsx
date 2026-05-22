"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_BANNERS } from "@/lib/constants";

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const banner = HERO_BANNERS[index];

  return (
    <section className="relative w-full overflow-hidden bg-muted dark:bg-black">
      <Link href={banner.href} className="relative block aspect-[21/9] w-full sm:aspect-[21/7]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200/95 via-gray-100/90 to-background dark:opacity-0" />
        <div
          className={`absolute inset-0 bg-gradient-to-r opacity-0 dark:opacity-100 ${banner.gradient}`}
        />
        <Image
          src={banner.image}
          alt={banner.title}
          fill
          className="object-contain object-right opacity-30 mix-blend-multiply dark:opacity-40 dark:mix-blend-screen"
          priority
          unoptimized
        />
        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
            {banner.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-white/70 md:text-lg">
            {banner.subtitle}
          </p>
        </div>
      </Link>

      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button
          type="button"
          onClick={() =>
            setIndex((i) => (i - 1 + HERO_BANNERS.length) % HERO_BANNERS.length)
          }
          className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground backdrop-blur hover:bg-foreground/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % HERO_BANNERS.length)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground backdrop-blur hover:bg-foreground/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {HERO_BANNERS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index
                ? "w-6 bg-foreground dark:bg-white"
                : "w-1.5 bg-foreground/30 dark:bg-white/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
