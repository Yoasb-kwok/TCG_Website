"use client";

import Image from "next/image";
import { useState } from "react";
import type { HomeBannerItem } from "@/lib/site-content";

const FALLBACK_SLIDE: HomeBannerItem = {
  id: "scarlet-violet-151",
  title: "Scarlet & Violet 151",
  subtitle: "香港現貨 · 單卡及封盒",
  image: "",
  href: "/products?cardSet=151",
  gradient: "",
};

function isSetHero(title: string): boolean {
  return title.includes("Scarlet") && title.includes("151");
}

export function HomeHero({ banners }: { banners: HomeBannerItem[] }) {
  const slides = banners.length > 0 ? banners : [FALLBACK_SLIDE];
  const [index, setIndex] = useState(0);
  const slide = slides[index % slides.length] ?? slides[0];
  const tournamentSlide = slide.title.includes("店賽");

  const go = (delta: number) => {
    setIndex((current) => (current + delta + slides.length) % slides.length);
  };

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-10 px-4 py-[56px] sm:px-6 xl:flex-row xl:items-center xl:gap-16 xl:px-0">
      <div className="flex w-full max-w-[576px] shrink-0 flex-col items-start gap-7">
        <div className="flex flex-col gap-7">
          {isSetHero(slide.title) ? (
            <h1
              className="text-[84px] font-medium leading-none text-[#0a0a09]"
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
            <h1 className="text-[64px] font-medium leading-none text-[#0a0a09]" aria-live="polite">
              {slide.title}
            </h1>
          )}
          <p className="max-w-[540px] text-[16px] leading-[1.65] text-[#625f58]">{slide.subtitle}</p>
        </div>
        <div className="flex gap-[12px]">
          <button
            type="button"
            aria-label="上一張 Banner"
            onClick={() => go(-1)}
            className={
              tournamentSlide
                ? "inline-flex h-[48px] w-[50px] items-center justify-center rounded-[10px] border border-[#6f59c7] bg-[#e6dfff] text-[14px] font-medium text-[#080808] transition hover:bg-[#ddd4fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
                : "inline-flex h-[48px] w-[50px] items-center justify-center rounded-[10px] border border-[#080808] bg-white text-[14px] font-medium text-[#080808] transition hover:bg-[#f7f5ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
            }
          >
            ←
          </button>
          <button
            type="button"
            aria-label="下一張 Banner"
            onClick={() => go(1)}
            className={
              tournamentSlide
                ? "inline-flex h-[48px] w-[50px] items-center justify-center rounded-[10px] border border-[#6f59c7] bg-[#e6dfff] text-[14px] font-medium text-[#080808] transition hover:bg-[#ddd4fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
                : "inline-flex h-[48px] w-[50px] items-center justify-center rounded-[10px] border border-[#080808] bg-white text-[14px] font-medium text-[#080808] transition hover:bg-[#f7f5ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
            }
          >
            →
          </button>
        </div>
      </div>

      <div
        className="relative w-full min-w-0 overflow-hidden rounded-[24px] border border-[#c8a24a] shadow-[0_18px_42px_rgba(0,0,0,0.18)] xl:max-w-[640px] xl:flex-1 [container-type:inline-size]"
        style={{
          backgroundImage: tournamentSlide
            ? "linear-gradient(139deg, rgb(61, 44, 120) 13%, rgb(124, 92, 196) 48%, rgb(224, 163, 40) 86%)"
            : "linear-gradient(139deg, rgb(5, 5, 5) 13%, rgb(36, 33, 26) 57%, rgb(200, 162, 74) 84%)",
        }}
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
                src={tournamentSlide ? "/brand/home/mew-ex-151.png" : "/brand/home/charizard-ex.png"}
                alt=""
                width={236}
                height={330}
                unoptimized
                preload
                className="h-[330px] w-[236px] object-contain shadow-[0_18px_42px_rgba(0,0,0,0.18)]"
              />
            </div>
          </div>
          <div className="absolute top-[77px] left-[276.7px] flex h-[365.968px] w-[289.719px] items-center justify-center">
            <div className="rotate-[10deg]">
              <Image
                src={tournamentSlide ? "/brand/home/pikachu-151.png" : "/brand/home/umbreon-vmax.png"}
                alt=""
                width={236}
                height={330}
                unoptimized
                preload
                className="h-[330px] w-[236px] object-contain shadow-[0_18px_42px_rgba(0,0,0,0.18)]"
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
