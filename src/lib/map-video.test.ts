import assert from "node:assert/strict";
import test from "node:test";
import {
  createMapVideoPathname,
  declaredMapVideoTypeAllowed,
  displayFilename,
  isBlobMapVideoUrl,
  isLocalMapVideoUrl,
  isPlayableMapVideoUrl,
  isSafeMapVideoPathname,
  MAP_VIDEO_MAX_BYTES,
  MAP_VIDEO_PLACEHOLDER,
  mapVideoStorageMode,
  mapVideoTooLargeMessage,
  sniffMapVideo,
} from "./map-video";

test("placeholder copy stays the storefront empty state", () => {
  assert.equal(MAP_VIDEO_PLACEHOLDER, "地圖影片稍後上載");
  assert.match(mapVideoTooLargeMessage(), /50MB/);
  assert.equal(MAP_VIDEO_MAX_BYTES, 50 * 1024 * 1024);
});

test("sniff accepts mp4 and webm headers and rejects other files", () => {
  const mp4 = new Uint8Array(16);
  mp4.set([0x66, 0x74, 0x79, 0x70], 4);
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(sniffMapVideo(mp4), "mp4");
  assert.equal(sniffMapVideo(webm), "webm");
  assert.equal(sniffMapVideo(png), null);
  assert.equal(sniffMapVideo(new Uint8Array()), null);
});

test("declared content type is limited to mp4 and webm", () => {
  assert.equal(declaredMapVideoTypeAllowed("video/mp4"), true);
  assert.equal(declaredMapVideoTypeAllowed("video/webm"), true);
  assert.equal(declaredMapVideoTypeAllowed(""), true);
  assert.equal(declaredMapVideoTypeAllowed("application/octet-stream"), true);
  assert.equal(declaredMapVideoTypeAllowed("video/quicktime"), false);
  assert.equal(declaredMapVideoTypeAllowed("image/png"), false);
});

test("display filename keeps a safe stem and the sniffed extension", () => {
  assert.equal(displayFilename("路線影片.mov", "mp4"), "路線影片.mp4");
  assert.equal(displayFilename("../../etc/passwd", "webm"), "passwd.webm");
  assert.equal(displayFilename("***", "mp4"), "map-video.mp4");
});

test("pathnames stay inside the map-video folder", () => {
  assert.equal(isSafeMapVideoPathname(createMapVideoPathname("mp4")), true);
  assert.equal(isSafeMapVideoPathname("map-video/store-map-Ab12.webm"), true);
  assert.equal(isSafeMapVideoPathname("map-video/../products/x.mp4"), false);
  assert.equal(isSafeMapVideoPathname("products/x.mp4"), false);
  assert.equal(isSafeMapVideoPathname("map-video/clip.mov"), false);
  assert.equal(isSafeMapVideoPathname("map-video/clip.mp4/extra"), false);
});

test("public playback urls are local uploads or this site's public blobs", () => {
  assert.equal(isLocalMapVideoUrl("/uploads/map-video/abc.mp4"), true);
  assert.equal(isPlayableMapVideoUrl("/uploads/map-video/abc.webm"), true);
  assert.equal(isLocalMapVideoUrl("/uploads/products/abc.mp4"), false);
  assert.equal(isLocalMapVideoUrl("/uploads/map-video/../products/abc.mp4"), false);
  assert.equal(isLocalMapVideoUrl("https://example.com/uploads/map-video/abc.mp4"), false);

  const blob = "https://store123.public.blob.vercel-storage.com/map-video/store-map-Ab12.mp4";
  assert.equal(isBlobMapVideoUrl(blob), true);
  assert.equal(isPlayableMapVideoUrl(blob), true);
  assert.equal(
    isBlobMapVideoUrl("https://store123.public.blob.vercel-storage.com/products/a.mp4"),
    false,
  );
  assert.equal(isBlobMapVideoUrl("https://evil.example/map-video/a.mp4"), false);
  assert.equal(isBlobMapVideoUrl("http://store123.public.blob.vercel-storage.com/map-video/a.mp4"), false);
  assert.equal(isPlayableMapVideoUrl(""), false);
});

test("storage mode prefers blob, and refuses ephemeral disk on Vercel", () => {
  assert.equal(mapVideoStorageMode({ blobToken: "token", vercel: "1" }), "blob");
  assert.equal(mapVideoStorageMode({ blobToken: "", vercel: "1" }), "unconfigured");
  assert.equal(mapVideoStorageMode({ blobToken: "", vercel: "" }), "local");
});
