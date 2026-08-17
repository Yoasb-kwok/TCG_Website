import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Noto_Sans_TC } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AuthSessionProvider } from "@/providers/session-provider";
import { CartProvider } from "@/providers/cart-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { FilterProvider } from "@/providers/filter-provider";
import { SITE_BRAND, SITE_TAGLINE } from "@/lib/constants";
import {
  resolveThemeClass,
  THEME_COOKIE,
  type ThemePreference,
} from "@/lib/theme-preference";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: SITE_BRAND,
    template: `%s | ${SITE_BRAND}`,
  },
  description: `${SITE_TAGLINE} — 單卡買賣、封盒現貨、店賽報名。門市自取。`,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const pref = cookieStore.get(THEME_COOKIE)?.value;
  const resolved = resolveThemeClass(pref, "dark");
  const themePreference: ThemePreference =
    pref === "light" || pref === "dark" || pref === "system" ? pref : "dark";

  return (
    <html
      lang="zh-HK"
      className={`${notoSansTC.variable} ${resolved} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
        <ThemeProvider
          defaultTheme={themePreference}
          initialResolved={resolved}
          enableSystem
        >
          <AuthSessionProvider>
            <CartProvider>
              <FilterProvider>
                <SiteHeader />
                <main className="flex-1">{children}</main>
                <SiteFooter />
              </FilterProvider>
            </CartProvider>
          </AuthSessionProvider>
        </ThemeProvider>

        <a
          href="https://wa.me/"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-105 hover:bg-green-400"
          aria-label="WhatsApp 聯絡"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      </body>
    </html>
  );
}
