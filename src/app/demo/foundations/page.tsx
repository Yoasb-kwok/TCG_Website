import Image from "next/image";

import { FoundationButton } from "@/components/foundations/button";
import { FoundationField } from "@/components/foundations/field";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Foundations",
  robots: { index: false, follow: false },
};

const SWATCHES = [
  ["paper", "#F2EFEB", "bg-trtcg-paper"],
  ["surface", "#FFFFFF", "bg-trtcg-surface"],
  ["ink", "#191817", "bg-trtcg-ink"],
  ["lavender", "#E8DFF8", "bg-trtcg-lavender"],
  ["peach", "#F9DBBD", "bg-trtcg-peach"],
  ["lime", "#EAF1CA", "bg-trtcg-lime"],
] as const;

const SUPPORTING = [
  ["line", "#DCCDAF", "bg-trtcg-line"],
  ["muted", "#5E5963", "bg-trtcg-muted"],
  ["gold", "#C8A24A", "bg-trtcg-gold"],
  ["header", "#080808", "bg-trtcg-header"],
  ["badge", "#FFE19A", "bg-trtcg-badge"],
  ["quiet", "rgba(221,235,159,0.42)", "bg-trtcg-quiet"],
] as const;

const BUTTONS = ["primary", "secondary", "quiet", "disabled"] as const;

export default function FoundationsPage() {
  return (
    <div className="bg-trtcg-paper text-trtcg-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-2">
          <p className="text-[13px] leading-[1.6] text-trtcg-muted">00 · Foundations</p>
          <h1 className="text-[28px] font-bold leading-[1.4]">TCGHK</h1>
          <p className="max-w-xl text-[16px] leading-[1.65] text-trtcg-muted">
            Shared tokens and controls. Soft storefront and POS fields stay on their own greys.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-[14px] font-bold leading-[1.45]">Color</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SWATCHES.map(([name, hex, swatch]) => (
              <li key={name} className="flex flex-col gap-2">
                <div className={`h-[72px] rounded-[16px] border border-trtcg-line ${swatch}`} />
                <p className="text-[14px] font-bold leading-[1.45]">{name}</p>
                <p className="text-[13px] leading-[1.6] text-trtcg-muted">{hex}</p>
              </li>
            ))}
          </ul>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SUPPORTING.map(([name, hex, swatch]) => (
              <li key={name} className="flex flex-col gap-2">
                <div className={`h-[72px] rounded-[16px] border border-trtcg-line ${swatch}`} />
                <p className="text-[14px] font-bold leading-[1.45]">{name}</p>
                <p className="text-[13px] leading-[1.6] text-trtcg-muted">{hex}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[14px] font-bold leading-[1.45]">Soft field vs paper</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            <li className="flex flex-col gap-2">
              <div className="h-[72px] rounded-[16px] border border-trtcg-line" style={{ backgroundColor: "#f7f5ef" }} />
              <p className="text-[14px] font-bold leading-[1.45]">Storefront Soft</p>
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">#F7F5EF · .storefront-canvas</p>
            </li>
            <li className="flex flex-col gap-2">
              <div className="h-[72px] rounded-[16px] border border-trtcg-line" style={{ backgroundColor: "#faf8f3" }} />
              <p className="text-[14px] font-bold leading-[1.45]">POS Soft</p>
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">#FAF8F3 · .pos-soft</p>
            </li>
            <li className="flex flex-col gap-2">
              <div className="h-[72px] rounded-[16px] border border-trtcg-line bg-trtcg-paper" />
              <p className="text-[14px] font-bold leading-[1.45]">Foundations paper</p>
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">#F2EFEB · --trtcg-paper</p>
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[14px] font-bold leading-[1.45]">Button</h2>
          <ul className="flex flex-wrap gap-4">
            {BUTTONS.map((variant) => (
              <li key={variant} className="flex flex-col items-start gap-2">
                <FoundationButton type="button" variant={variant}>
                  加入
                </FoundationButton>
                <p className="text-[13px] leading-[1.6] text-trtcg-muted">{variant}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap items-start gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-[14px] font-bold leading-[1.45]">Input</h2>
            <FoundationField label="電郵" name="email" autoComplete="off" />
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-[14px] font-bold leading-[1.45]">Badge</h2>
            <Badge variant="foundation">報名中</Badge>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[14px] font-bold leading-[1.45]">Light & shadow</h2>
          <div className="flex flex-wrap gap-6">
            <div className="flex h-[148px] w-full max-w-[400px] flex-col justify-center rounded-[24px] bg-trtcg-surface px-8 shadow-trtcg-card">
              <p className="text-[28px] font-bold leading-[1.4]">Card</p>
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">TRTCG / Card</p>
            </div>
            <div className="flex h-[148px] w-full max-w-[400px] flex-col justify-center rounded-[24px] bg-trtcg-surface px-8 shadow-trtcg-float">
              <p className="text-[28px] font-bold leading-[1.4]">Float</p>
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">TRTCG / Float</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[14px] font-bold leading-[1.45]">Typography</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">Noto Sans TC</p>
              <p className="mt-2 text-[28px] font-bold leading-[1.4]">香港 Pokémon TCG 專門店</p>
            </div>
            <div>
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">DM Sans / Playfair Display</p>
              <p className="mt-2 text-[28px] leading-[1.4]" style={{ fontFamily: "var(--font-dm), sans-serif" }}>
                Scarlet & Violet 151
              </p>
              <p className="text-[28px] italic leading-[1.4]" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Scarlet & Violet 151
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[14px] font-bold leading-[1.45]">Pattern sources</h2>
          <div className="flex flex-wrap items-start gap-6">
            <figure className="max-w-[360px]">
              <Image
                src="/brand/foundations/gold-cloud.png"
                alt="Gold cloud and crane"
                width={1024}
                height={392}
                className="h-auto w-full rounded-[16px] border border-[#c9a140]"
              />
              <figcaption className="mt-2 text-[13px] leading-[1.6] text-trtcg-muted">Gold cloud · 37:2</figcaption>
            </figure>
            <figure className="max-w-[360px]">
              <Image
                src="/brand/foundations/embossed-energy.jpg"
                alt="Embossed energy texture"
                width={760}
                height={407}
                className="h-auto w-full rounded-[16px] border border-[#c9a140]"
              />
              <figcaption className="mt-2 text-[13px] leading-[1.6] text-trtcg-muted">Embossed energy · 37:3</figcaption>
            </figure>
            <figure>
              <div
                aria-hidden="true"
                className="foundations-wallpaper h-[220px] w-[140px] rounded-[24px] shadow-[0_14px_30px_rgba(64,46,20,0.18)]"
              />
              <figcaption className="mt-2 text-[13px] leading-[1.6] text-trtcg-muted">
                Sparse cloud-crane · 66:2
              </figcaption>
            </figure>
            <figure>
              <Image
                src="/brand/foundations/sparse-cloud-crane-wallpaper.png"
                alt="Storefront sparse cloud-crane tile"
                width={470}
                height={835}
                className="h-auto w-[140px] rounded-[24px]"
              />
              <figcaption className="mt-2 max-w-[140px] text-[13px] leading-[1.6] text-trtcg-muted">
                Storefront PNG copy
              </figcaption>
            </figure>
          </div>
        </section>
      </div>
    </div>
  );
}
