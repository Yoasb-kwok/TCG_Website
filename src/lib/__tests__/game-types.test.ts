import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => mockPrisma,
  isDatabaseConfigured: () => true,
}));

const mockPrisma = {
  gameType: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  product: {
    count: vi.fn(),
  },
  taxonomyOption: {
    count: vi.fn(),
  },
} as unknown as PrismaClient;

import {
  listActiveGameTypes,
  getGameTypeBySlug,
  getGameTypeById,
  createGameType,
  updateGameType,
  deleteGameType,
} from "@/lib/game-types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listActiveGameTypes", () => {
  it("returns game types ordered by sortOrder", async () => {
    const mockData = [
      { id: "1", name: "Pokémon", slug: "pokemon", sortOrder: 0, isActive: true },
      { id: "2", name: "One Piece", slug: "one-piece", sortOrder: 1, isActive: true },
    ];
    (mockPrisma.gameType.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const result = await listActiveGameTypes();
    expect(result).toEqual(mockData);
    expect(mockPrisma.gameType.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });

  it("excludes inactive game types", async () => {
    (mockPrisma.gameType.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listActiveGameTypes();
    expect(mockPrisma.gameType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      }),
    );
  });
});

describe("getGameTypeBySlug", () => {
  it("returns game type by slug", async () => {
    const mockData = { id: "1", name: "Pokémon", slug: "pokemon", sortOrder: 0, isActive: true };
    (mockPrisma.gameType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const result = await getGameTypeBySlug("pokemon");
    expect(result).toEqual(mockData);
    expect(mockPrisma.gameType.findUnique).toHaveBeenCalledWith({
      where: { slug: "pokemon" },
    });
  });

  it("returns null for non-existent slug", async () => {
    (mockPrisma.gameType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getGameTypeBySlug("nonexistent");
    expect(result).toBeNull();
  });
});

describe("createGameType", () => {
  it("creates a game type with name and slug", async () => {
    const mockData = { id: "1", name: "One Piece", slug: "one-piece", sortOrder: 1, isActive: true };
    (mockPrisma.gameType.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const result = await createGameType({ name: "One Piece", slug: "one-piece", sortOrder: 1 });
    expect(result).toEqual(mockData);
    expect(mockPrisma.gameType.create).toHaveBeenCalledWith({
      data: { name: "One Piece", slug: "one-piece", sortOrder: 1, isActive: true },
    });
  });

  it("auto-generates slug from name if not provided", async () => {
    const mockData = { id: "1", name: "Disney Lorcana", slug: "disney-lorcana", sortOrder: 2, isActive: true };
    (mockPrisma.gameType.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const result = await createGameType({ name: "Disney Lorcana" });
    expect(result.slug).toBe("disney-lorcana");
    expect(mockPrisma.gameType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "disney-lorcana" }),
      }),
    );
  });

  it("rejects empty name", async () => {
    await expect(createGameType({ name: "" })).rejects.toThrow();
  });

  it("rejects whitespace-only name", async () => {
    await expect(createGameType({ name: "   " })).rejects.toThrow();
  });
});

describe("deleteGameType", () => {
  it("deletes game type with no linked products or taxonomy", async () => {
    (mockPrisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (mockPrisma.taxonomyOption.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (mockPrisma.gameType.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await deleteGameType("1");
    expect(mockPrisma.gameType.delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("throws if products are linked", async () => {
    (mockPrisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    (mockPrisma.taxonomyOption.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await expect(deleteGameType("1")).rejects.toThrow("商品");
  });

  it("throws if taxonomy options are linked", async () => {
    (mockPrisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (mockPrisma.taxonomyOption.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    await expect(deleteGameType("1")).rejects.toThrow("標籤");
  });
});

describe("updateGameType", () => {
  it("updates name", async () => {
    const mockData = { id: "1", name: "Updated", slug: "pokemon", sortOrder: 0, isActive: true };
    (mockPrisma.gameType.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const result = await updateGameType("1", { name: "Updated" });
    expect(result).toEqual(mockData);
    expect(mockPrisma.gameType.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { name: "Updated" },
    });
  });

  it("updates sortOrder", async () => {
    const mockData = { id: "1", name: "Pokémon", slug: "pokemon", sortOrder: 5, isActive: true };
    (mockPrisma.gameType.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    await updateGameType("1", { sortOrder: 5 });
    expect(mockPrisma.gameType.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { sortOrder: 5 },
    });
  });

  it("updates isActive", async () => {
    const mockData = { id: "1", name: "Pokémon", slug: "pokemon", sortOrder: 0, isActive: false };
    (mockPrisma.gameType.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    await updateGameType("1", { isActive: false });
    expect(mockPrisma.gameType.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { isActive: false },
    });
  });
});
