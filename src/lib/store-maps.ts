import { STORE } from "@/lib/constants";

/**
 * Google Maps search for the storefront pin.
 * Uses the building-level `STORE.mapQuery` (not the unit address).
 */
export function getStoreMapsUrl(query: string = STORE.mapQuery): string {
  const params = new URLSearchParams({
    api: "1",
    query,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
