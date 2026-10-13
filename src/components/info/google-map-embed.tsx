import { STORE } from "@/lib/constants";

interface GoogleMapEmbedProps {
  url: string;
}

export function GoogleMapEmbed({ url }: GoogleMapEmbedProps) {
  if (!url) return null;

  const label = `門市地圖：${STORE.address.zh}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <iframe
        src={url}
        title={label}
        aria-label={label}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[360px] w-full"
      />
    </div>
  );
}
