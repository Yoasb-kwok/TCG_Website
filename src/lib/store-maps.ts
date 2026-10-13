import { STORE } from "@/lib/constants";

/**
 * Google Maps search for the storefront pin.
 * `STORE.mapQuery` is the geocodable building query for the storefront pin.
 */
export function getStoreMapsUrl(query: string = STORE.mapQuery): string {
  const params = new URLSearchParams({
    api: "1",
    query,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** Google Maps iframe `src` for the same storefront pin. */
export function getStoreMapEmbedUrl(query: string = STORE.mapQuery): string {
  const params = new URLSearchParams({
    q: query,
    hl: "zh-HK",
    z: "17",
    output: "embed",
  });
  return `https://www.google.com/maps?${params.toString()}`;
}
