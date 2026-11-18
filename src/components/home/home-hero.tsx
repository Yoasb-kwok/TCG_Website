"use client";

import Image from "next/image";
import { useState } from "react";
import { FoundationButton } from "@/components/foundations/button";
import type { HomeBannerItem } from "@/lib/site-content";

const FALLBACK_SLIDE: HomeBannerItem = {
  id: "scarlet-violet-151",
  title: "Scarlet & Violet 151",
  subtitle: "香港現貨 · 單卡及封盒",
  image: "",
  href: "/products?cardSet=151",
  gradient: "",
};

/** Soft frames 5:2 and 18:157 share this atmosphere. */
const HERO_ATMOSPHERE =
  "linear-gradient(139deg, rgb(8, 8, 12) 13%, rgb(61, 44, 120) 47%, rgb(224, 163, 40) 84%)";

function isSetHero(title: string): boolean {
  return title.includes("Scarlet") && title.includes("151");
}

export function HomeHero({ banners }: { banners: HomeBannerItem[] }) {
  const slides = banners.length > 0 ? banners : [FALLBACK_SLIDE];
  const [index, setIndex] = useState(0);
  const slide = slides[index % slides.length] ?? slides[0];

  const go = (delta: number) => {
    setIndex((current) => (current + delta + slides.length) % slides.length);
  };

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-10 px-4 py-[56px] sm:px-6 xl:flex-row xl:items-center xl:gap-[64px] xl:px-0">
      <div className="flex w-full max-w-[576px] shrink-0 flex-col items-start gap-[28px]">
        {isSetHero(slide.title) ? (
          <h1
            className="text-[84px] font-medium leading-none text-trtcg-ink"
            style={{ fontFamily: "var(--font-dm), var(--font-sans), sans-serif" }}
            aria-live="polite"
          >
            <span className="block">Scarlet &</span>
            <span className="block">
              Violet{" "}
              <span className="font-normal italic" style={{ fontFamily: "var(--font-playfair), serif" }}>
                151
              </span>
            </span>
          </h1>
        ) : (
          <h1 className="text-[64px] font-medium leading-none text-trtcg-ink" aria-live="polite">
            {slide.title}
          </h1>
        )}
        <p className="max-w-[540px] text-[16px] leading-[1.65] text-trtcg-muted">{slide.subtitle}</p>
        <div className="flex gap-[12px]">
          <FoundationButton
            type="button"
            variant="secondary"
            aria-label="上一張 Banner"
            onClick={() => go(-1)}
            className="w-[50px] px-0"
          >
            ←
          </FoundationButton>
          <FoundationButton
            type="button"
            variant="secondary"
            aria-label="下一張 Banner"
            onClick={() => go(1)}
            className="w-[50px] px-0"
          >
            →
          </FoundationButton>
        </div>
      </div>

      <div
        className="relative w-full min-w-0 overflow-hidden rounded-[24px] border border-trtcg-badge-border shadow-trtcg-float xl:max-w-[640px] xl:flex-1 [container-type:inline-size]"
        style={{ backgroundImage: HERO_ATMOSPHERE }}
      >
        <div className="aspect-[640/530] w-full" />
        <div
          className="absolute top-0 left-0 h-[530px] w-[640px] origin-top-left"
          style={{ transform: "scale(calc(100cqw / 640px))" }}
        >
          <Image
            src="/brand/home/ambient-light.svg"
            alt=""
            width={420}
            height={420}
            unoptimized
            preload
            className="absolute top-[-141px] left-[189px]"
          />
          <div className="absolute top-[63.93px] left-[99px] flex h-[371.856px] w-[299.454px] items-center justify-center">
            <div className="-rotate-12">
              <Image
                src="/brand/home/charizard-ex.png"
                alt=""
                width={236}
                height={330}
                unoptimized
                preload
                className="h-[330px] w-[236px] object-contain shadow-trtcg-float"
              />
            </div>
          </div>
          <div className="absolute top-[77px] left-[276.7px] flex h-[365.968px] w-[289.719px] items-center justify-center">
            <div className="rotate-[10deg]">
              <Image
                src="/brand/home/umbreon-vmax.png"
                alt=""
                width={236}
                height={330}
                unoptimized
                preload
                className="h-[330px] w-[236px] object-contain shadow-trtcg-float"
              />
            </div>
          </div>
          <Image
            src="/brand/home/scarlet-violet-151.png"
            alt="Scarlet & Violet 151"
            width={170}
            height={100}
            unoptimized
            preload
            className="absolute top-[24px] left-[29px] h-[100px] w-[170px] object-contain"
          />
        </div>
      </div>
    </section>
  );
}
