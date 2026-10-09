import type { Metadata } from "next";
import { cookies } from "next/headers";
import { M_PLUS_Rounded_1c, Noto_Sans_TC } from "next/font/google";
import { StorefrontFrame } from "@/components/layout/storefront-frame";
import { AuthSessionProvider } from "@/providers/session-provider";
import { CartProvider } from "@/providers/cart-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { SITE_BRAND, SITE_TAGLINE } from "@/lib/constants";
import { resolveWhatsAppHref } from "@/lib/whatsapp";
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

const posRounded = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-pos",
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
      className={`${notoSansTC.variable} ${posRounded.variable} ${resolved} h-full`}
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
              <StorefrontFrame whatsappHref={resolveWhatsAppHref()}>{children}</StorefrontFrame>
            </CartProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
