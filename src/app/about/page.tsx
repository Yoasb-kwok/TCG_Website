import type { Metadata } from "next";
import { InfoPageLayout, InfoSection } from "@/components/info/info-page-layout";
import { GoogleMapEmbed } from "@/components/info/google-map-embed";
import { SITE_BRAND } from "@/lib/constants";
import { getAboutContent } from "@/lib/site-content";
import { resolveWhatsAppHref, whatsappDisplayNumber } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const about = await getAboutContent();
  return {
    title: about.pageTitle,
    description: about.pageSubtitle || `${SITE_BRAND} — 香港 Pokémon TCG 專門店`,
  };
}

export default async function AboutPage() {
  const about = await getAboutContent();
  const whatsappHref = resolveWhatsAppHref();
  const whatsappNumber = whatsappDisplayNumber(whatsappHref);

  return (
    <InfoPageLayout
      title={about.pageTitle}
      subtitle={about.pageSubtitle}
    >
      {about.sections.map((section) => (
        <InfoSection key={section.id} title={section.title}>
          {section.body.split(/\n{2,}/).map((paragraph, index) => (
            <p key={`${section.id}-${index}`}>{paragraph}</p>
          ))}
        </InfoSection>
      ))}

      {about.showStoreInfo && (
        <InfoSection title="門市資訊">
          <p className="font-medium text-foreground">{about.storeAddressZh}</p>
          <p className="mt-1 text-muted-foreground">{about.storeAddressEn}</p>
          <p className="mt-2">{about.storeMtr}</p>
          <p className="mt-2">營業時間：{about.storeHours}</p>
          <div className="mt-4">
            <GoogleMapEmbed url={about.mapEmbedUrl} />
          </div>
        </InfoSection>
      )}

      <InfoSection title="聯絡我們">
        {about.contactBody.split(/\n{2,}/).map((paragraph, index) => (
          <p key={`contact-${index}`}>{paragraph}</p>
        ))}
        {whatsappHref && whatsappNumber && (
          <p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              WhatsApp {whatsappNumber}
            </a>
          </p>
        )}
      </InfoSection>
    </InfoPageLayout>
  );
}
