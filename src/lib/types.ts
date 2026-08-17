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
  // ADR-005 inventory fields (present on DB-backed products, absent on demo data)
  bookedStock?: number;
  reservedStock?: number;
  reservedNote?: string | null;
  lowThreshold?: number | null;
  criticalThreshold?: number | null;
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
  externalCardId?: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
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
  durationMinutes: number;
  status: string;
  registeredCount: number;
}

export interface RegistrationInput {
  tournamentId: string;
  playerName: string;
  email: string;
  phone?: string;
}
