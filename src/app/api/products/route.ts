import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import type { ProductSort, ProductType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "24");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const cardSet = searchParams.get("cardSet") ?? undefined;
  const rarity = searchParams.get("rarity") ?? undefined;
  const pokemonType = searchParams.get("pokemonType") ?? undefined;
  const type = (searchParams.get("type") as ProductType | null) ?? undefined;
  const inStock = searchParams.get("inStock") === "true";
  const search = searchParams.get("search") ?? undefined;
  const language = searchParams.get("language") ?? undefined;
  const sort = (searchParams.get("sort") as ProductSort | null) ?? "newest";
  const gameType = searchParams.get("gameType") ?? undefined;

  const setCodes = searchParams.getAll("setCode").filter(Boolean);
  const rarityTiers = searchParams.getAll("rarityTier").filter(Boolean);

  const data = await getProducts({
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 24 : pageSize,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    cardSet,
    rarity,
    setCodes: setCodes.length ? setCodes : undefined,
    rarityTiers: rarityTiers.length ? rarityTiers : undefined,
    pokemonType,
    type,
    inStock,
    search,
    language,
    sort,
    gameType,
  });

  return NextResponse.json(data);
}
