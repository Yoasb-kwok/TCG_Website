/** 對應標籤管理 PRODUCT_TYPE 的 value */
export type ProductType = string;

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

export interface ProductVariant {
  id: string;
  condition: string;
  isFoil: boolean;
  price: number;
  stock: number;
  sku: string;
  /** 未設定時為 null 或缺省 */
  barcode?: string | null;
}

export interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ProductType;
  cardSet: string | null;
  cardNumber: string | null;
  rarity: string | null;
  setCode?: string | null;
  rarityTier?: string | null;
  cardCategory?: string | null;
  pokemonType: string | null;
  language: string;
  /** Catalog game slug. Missing values are Pokémon. */
  game?: string | null;
  externalCardId?: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
}

/** A card from the self-hosted catalog. It is not a sellable SKU. */
export interface CatalogSearchHit {
  id: string;
  setCode: string;
  setNameZhTw: string | null;
  collectorNumber: string;
  altCollectorNumber: string | null;
  nameZhTw: string | null;
  nameJa: string | null;
  nameEn: string | null;
  imageUrl: string | null;
  rarity: string | null;
}

export interface ProductsResponse {
  products: ProductWithVariants[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: {
    cardSets: string[];
    rarities: string[];
    pokemonTypes: string[];
    setCodes: string[];
    rarityTiers: string[];
  };
  /** Present when the search also checked the card catalog. */
  catalog?: {
    cards: CatalogSearchHit[];
    total: number;
  };
}

export type ProductSort =
  | "newest"
  | "setCode"
  | "rarityTier"
  | "priceAsc"
  | "priceDesc";

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  condition: string;
  isFoil: boolean;
  price: number;
  quantity: number;
  stock: number;
  sku: string;
}

export interface TournamentItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  format: string;
  maxPlayers: number;
  entryFee: number;
  prizePool: string | null;
  location: string;
  startsAt: string;
  registrationDeadline: string;
  status: string;
  registeredCount: number;
}
