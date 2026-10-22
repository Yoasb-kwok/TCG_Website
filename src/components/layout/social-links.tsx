import { Link2 } from "lucide-react";
import type { ResolvedSocialLink, SocialIconId } from "@/lib/social";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M14.2 8.5V6.8c0-.7.5-1.1 1.2-1.1h1.6V3h-2.3C12.2 3 10.6 4.6 10.6 7.1v1.4H8.5V11h2.1v10h3.2V11h2.2l.4-2.5h-2.6z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SocialIcon({ icon, className }: { icon: SocialIconId; className?: string }) {
  if (icon === "instagram") return <InstagramIcon className={className} />;
  if (icon === "facebook") return <FacebookIcon className={className} />;
  if (icon === "whatsapp") return <WhatsAppIcon className={className} />;
  return <Link2 className={className} aria-hidden="true" />;
}

const linkClassName = {
  footer:
    "inline-flex items-center gap-2 rounded-md border border-rice-border px-2.5 py-1.5 text-sm text-rice-muted transition hover:text-rice-foreground focus-visible:text-rice-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  header:
    "inline-flex rounded-md p-2 text-muted-foreground transition hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
} as const;

export function SocialLinks({
  links,
  variant,
}: {
  links: ResolvedSocialLink[];
  variant: "footer" | "header";
}) {
  if (links.length === 0) return null;

  const list = (
    <ul className={variant === "footer" ? "flex flex-wrap items-center gap-2" : "flex items-center gap-0.5"}>
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.accessibleName}
            title={link.accessibleName}
            className={linkClassName[variant]}
          >
            <SocialIcon icon={link.icon} className={variant === "footer" ? "h-4 w-4" : "h-5 w-5"} />
            {variant === "footer" ? <span>{link.label}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );

  if (variant === "header") return list;

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-rice-foreground">社交媒體</p>
      {list}
    </div>
  );
}
