interface GoogleMapEmbedProps {
  url: string;
}

export function GoogleMapEmbed({ url }: GoogleMapEmbedProps) {
  if (!url) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <iframe
        src={url}
        title="Google Map"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[360px] w-full"
      />
    </div>
  );
}
