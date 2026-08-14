import { test, expect } from "@playwright/test";
import { setAdminAuth } from "./auth-helpers";

/**
 * E2E smoke test: Game Type System (ADR-006)
 *
 * All API calls are mocked — no real database needed.
 * Tests the storefront dynamic route, game tabs, and admin CRUD.
 */

const mockGameTypes = [
  { id: "gt-pokemon", name: "Pokémon", slug: "pokemon", sortOrder: 0, isActive: true },
  { id: "gt-onepiece", name: "One Piece", slug: "one-piece", sortOrder: 1, isActive: true },
];

const mockProducts = {
  products: [
    {
      id: "p1",
      name: "Pikachu ex",
      slug: "pikachu-ex",
      description: "Test card",
      type: "SINGLE",
      cardSet: "M3",
      cardNumber: "001",
      rarity: "MUR",
      setCode: "M3",
      rarityTier: "MUR",
      cardCategory: "POKEMON",
      pokemonType: "ELECTRIC",
      language: "zh-HK",
      variants: [{ id: "v1", condition: "NM", isFoil: false, price: 100, stock: 5, sku: "p1-nm" }],
      images: [],
    },
  ],
  total: 1,
  page: 1,
  pageSize: 24,
  totalPages: 1,
  filters: {
    cardSets: ["M3"],
    rarities: ["MUR"],
    pokemonTypes: ["ELECTRIC"],
    setCodes: ["M3"],
    rarityTiers: ["MUR"],
  },
};

test.describe("Game Type System", () => {
  test("storefront: /products redirects to /products/pokemon", async ({ page }) => {
    await page.route("**/api/games", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockGameTypes),
      }),
    );

    await page.route("**/api/products**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProducts),
      }),
    );

    await page.goto("/products");
    await page.waitForURL("**/products/pokemon");
    expect(page.url()).toContain("/products/pokemon");
  });

  test("storefront: game tabs are visible and clickable", async ({ page }) => {
    await page.route("**/api/games", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockGameTypes),
      }),
    );

    await page.route("**/api/products**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProducts),
      }),
    );

    await page.route("**/api/taxonomy**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          grouped: { PRODUCT_TYPE: [], SET_CODE: [], RARITY: [] },
        }),
      }),
    );

    await page.goto("/products/pokemon");
    await page.waitForLoadState("networkidle");

    // Game tabs render client-side after fetching /api/games
    // Wait for the nav element with game links to appear
    const gameNav = page.locator('nav:has(a[href="/products/pokemon"])');
    await expect(gameNav).toBeVisible({ timeout: 15000 });
  });

  test("admin: /admin/games shows game type list", async ({ page }) => {
    await setAdminAuth(page);

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin-1", email: "admin@test", name: "Admin", role: "ADMIN" },
          expires: "2099-01-01",
        }),
      }),
    );

    await page.route("**/api/admin/games", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockGameTypes),
      }),
    );

    await page.goto("/admin/games");
    await page.waitForLoadState("networkidle");

    // Use table cell to avoid matching sidebar/other text
    const pokemonCell = page.locator('td:has-text("Pokémon")');
    await expect(pokemonCell).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td:has-text("One Piece")')).toBeVisible();
  });

  test("admin: create game type button exists", async ({ page }) => {
    await setAdminAuth(page);

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin-1", email: "admin@test", name: "Admin", role: "ADMIN" },
          expires: "2099-01-01",
        }),
      }),
    );

    await page.route("**/api/admin/games", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockGameTypes),
      }),
    );

    await page.goto("/admin/games");
    await page.waitForLoadState("networkidle");

    // Use button role to avoid matching the description text
    await expect(page.getByRole("button", { name: "新增" })).toBeVisible({ timeout: 10000 });
  });
});
