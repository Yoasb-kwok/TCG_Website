import { Video } from "lucide-react";
import { isPlayableMapVideoUrl, MAP_VIDEO_PLACEHOLDER, videoSourceType } from "@/lib/map-video";

export function MapLocationVideo({ url }: { url: string }) {
  if (!isPlayableMapVideoUrl(url)) {
    return (
      <div
        className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center"
        role="status"
      >
        <Video className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">{MAP_VIDEO_PLACEHOLDER}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black">
      <video
        controls
        preload="none"
        playsInline
        className="aspect-video w-full"
        aria-label="門市路線影片"
      >
        <source src={url} type={videoSourceType(url)} />
        您的瀏覽器不支援影片播放。
      </video>
    </div>
  );
}
