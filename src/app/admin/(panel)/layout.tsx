import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { MerchantHeader, MerchantShopNav } from "@/components/admin/merchant-header";
import { StorefrontWallpaper } from "@/components/home/home-textures";
import { SiteFooter } from "@/components/layout/site-footer";
import { resolveSocialLinks } from "@/lib/social";
import { resolveWhatsAppHref } from "@/lib/whatsapp";
import { TaxonomyProvider } from "@/providers/taxonomy-provider";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const socialLinks = resolveSocialLinks({ whatsappHref: resolveWhatsAppHref() });

  return (
    <TaxonomyProvider>
      <div className="merchant-admin storefront-canvas relative isolate flex min-h-screen flex-col text-trtcg-ink">
        <StorefrontWallpaper />
        <MerchantHeader />
        <div className="relative z-[1] mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 pb-12 sm:px-6 xl:px-0">
          <MerchantShopNav />
          <div className="flex flex-col items-stretch gap-8 pb-8 pt-8 xl:flex-row xl:items-start xl:pt-16">
            <AdminSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
          <SiteFooter socialLinks={socialLinks} inset />
        </div>
      </div>
    </TaxonomyProvider>
  );
}
