import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  TOURNAMENT_STATUSES,
  getStatusOptions,
  getDisplayName,
  isOrderReceipt,
  isTournamentReceipt,
  type OrderReceiptData,
  type TournamentReceiptData,
  type ReceiptData,
  type TransactionRow,
} from "../transaction-types";

describe("transaction-types", () => {
  // ── Status options ───────────────────────────────────────────────────

  describe("ORDER_STATUSES", () => {
    it("includes all 7 statuses", () => {
      expect(ORDER_STATUSES).toHaveLength(7);
      expect(ORDER_STATUSES).toContain("FAILED");
      expect(ORDER_STATUSES).toContain("NOT_REQUIRED");
      expect(ORDER_STATUSES).toContain("SHIPPED");
      expect(ORDER_STATUSES).toContain("COMPLETED");
    });
  });

  describe("TOURNAMENT_STATUSES", () => {
    it("excludes SHIPPED and COMPLETED", () => {
      expect(TOURNAMENT_STATUSES).not.toContain("SHIPPED");
      expect(TOURNAMENT_STATUSES).not.toContain("COMPLETED");
    });

    it("includes 5 statuses", () => {
      expect(TOURNAMENT_STATUSES).toHaveLength(5);
    });
  });

  describe("getStatusOptions", () => {
    it("returns all 7 statuses for ORDER", () => {
      const options = getStatusOptions("ORDER");
      expect(options).toHaveLength(7);
      expect(options).toContain("SHIPPED");
    });

    it("returns 5 statuses for TOURNAMENT (no SHIPPED/COMPLETED)", () => {
      const options = getStatusOptions("TOURNAMENT");
      expect(options).toHaveLength(5);
      expect(options).not.toContain("SHIPPED");
      expect(options).not.toContain("COMPLETED");
    });
  });

  // ── Display name ─────────────────────────────────────────────────────

  describe("getDisplayName", () => {
    it("returns customerName when present", () => {
      expect(
        getDisplayName({ customerName: "Alice", email: "alice@test.com" }),
      ).toBe("Alice");
    });

    it("returns email when customerName is null (guest)", () => {
      expect(
        getDisplayName({ customerName: null, email: "guest@test.com" }),
      ).toBe("guest@test.com");
    });
  });

  // ── Type guards ──────────────────────────────────────────────────────

  describe("isOrderReceipt", () => {
    it("returns true for ORDER receipt", () => {
      const data: ReceiptData = {
        type: "ORDER",
        orderId: "123",
        email: "test@test.com",
        items: [],
        totalAmount: 100,
        date: "2026-01-01",
      };
      expect(isOrderReceipt(data)).toBe(true);
      expect(isTournamentReceipt(data)).toBe(false);
    });
  });

  describe("isTournamentReceipt", () => {
    it("returns true for TOURNAMENT receipt", () => {
      const data: ReceiptData = {
        type: "TOURNAMENT",
        tournamentTitle: "Test Cup",
        playerName: "Alice",
        entryFee: 50,
        startsAt: "2026-01-01T10:00:00Z",
        location: "Shop",
        date: "2026-01-01",
      };
      expect(isTournamentReceipt(data)).toBe(true);
      expect(isOrderReceipt(data)).toBe(false);
    });
  });

  // ── Type narrowing at compile time ───────────────────────────────────

  describe("discriminated union narrowing", () => {
    it("narrows to OrderReceiptData when type is ORDER", () => {
      const data: ReceiptData = {
        type: "ORDER",
        orderId: "abc",
        email: "x@y.com",
        items: [],
        totalAmount: 0,
        date: "2026-01-01",
      };

      if (isOrderReceipt(data)) {
        // TypeScript knows data is OrderReceiptData here
        expect(data.orderId).toBe("abc");
        expect(data.items).toEqual([]);
      }
    });

    it("narrows to TournamentReceiptData when type is TOURNAMENT", () => {
      const data: ReceiptData = {
        type: "TOURNAMENT",
        tournamentTitle: "Cup",
        playerName: "Bob",
        entryFee: 30,
        startsAt: "2026-06-01T10:00:00Z",
        location: "Mong Kok",
        date: "2026-01-01",
      };

      if (isTournamentReceipt(data)) {
        // TypeScript knows data is TournamentReceiptData here
        expect(data.tournamentTitle).toBe("Cup");
        expect(data.playerName).toBe("Bob");
      }
    });
  });
});
