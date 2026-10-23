"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { HomeTextures } from "@/components/home/home-textures";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { isDemoShellPath } from "@/lib/demo-paths";
import type { ResolvedSocialLink } from "@/lib/social";
import type { StorefrontCategoryLink } from "@/lib/storefront-categories";
import { cn } from "@/lib/utils";

function WhatsAppButton({ href, canvas }: { href: string; canvas: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#ece7dc] shadow-[0_10px_24px_rgba(0,0,0,0.1)] transition hover:bg-white",
        canvas
          ? "fixed right-4 bottom-6 xl:absolute xl:right-[max(16px,calc((100%-1328px)/2))] xl:bottom-auto xl:top-[818px]"
          : "fixed right-6 bottom-6",
      )}
      aria-label="WhatsApp 聯絡"
    >
      <Image src="/brand/home/icon-whatsapp.svg" alt="" width={25} height={25} unoptimized />
    </a>
  );
}

export function StorefrontFrame({
  children,
  whatsappHref,
  socialLinks,
  pokemonCategories,
}: {
  children: React.ReactNode;
  whatsappHref: string | null;
  socialLinks: ResolvedSocialLink[];
  pokemonCategories: StorefrontCategoryLink[];
}) {
  const pathname = usePathname();
  const locked = pathname === "/tournaments/live" || pathname.startsWith("/pos");
  const demoShell = isDemoShellPath(pathname);
  const figmaCanvas = pathname === "/" || pathname === "/cart" || pathname === "/products";

  if (locked || demoShell) {
    return (
      <div className={locked ? "min-h-dvh flex-1 lg:h-dvh lg:overflow-hidden" : "flex min-h-full flex-1 flex-col"}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-full flex-1 flex-col",
        figmaCanvas && "isolate bg-[#f7f5ef] text-[#0a0a09]",
      )}
    >
      {figmaCanvas ? <HomeTextures /> : null}
      <SiteHeader socialLinks={socialLinks} pokemonCategories={pokemonCategories} />
      <main className={cn("relative z-[1]", pathname === "/cart" ? "shrink-0" : "flex-1")}>{children}</main>
      <div
        className={cn(
          "relative z-[1]",
          figmaCanvas && "mx-auto w-full max-w-[1280px] px-4 sm:px-6 xl:px-0",
          (pathname === "/" || pathname === "/products") && "pt-8 pb-12",
          pathname === "/cart" && "pb-[48px]",
        )}
      >
        <SiteFooter socialLinks={socialLinks} inset={figmaCanvas} />
      </div>
      {whatsappHref ? <WhatsAppButton href={whatsappHref} canvas={figmaCanvas} /> : null}
    </div>
  );
}
