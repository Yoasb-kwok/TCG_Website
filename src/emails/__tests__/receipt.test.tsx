import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { ReceiptEmail } from "../receipt";
import type { OrderReceiptData, TournamentReceiptData } from "@/lib/transaction-types";

describe("ReceiptEmail", () => {
  const orderData: OrderReceiptData = {
    type: "ORDER",
    orderId: "order-abc-12345",
    email: "alice@test.com",
    items: [
      { name: "Pikachu", condition: "NM", quantity: 2, unitPrice: 50 },
      { name: "Charizard", condition: "LP", quantity: 1, unitPrice: 80 },
    ],
    totalAmount: 180,
    date: "2026-01-15T10:00:00.000Z",
  };

  const tournamentData: TournamentReceiptData = {
    type: "TOURNAMENT",
    tournamentTitle: "Sunday Cup",
    playerName: "Alice Wong",
    entryFee: 100,
    startsAt: "2026-03-01T14:00:00.000Z",
    location: "Mong Kok Store",
    date: "2026-02-01T08:00:00.000Z",
  };

  it("renders ORDER receipt without error", async () => {
    const html = await render(ReceiptEmail({ data: orderData }));
    expect(html).toBeTruthy();
    expect(html).toContain("訂單收據");
  });

  it("renders TOURNAMENT receipt without error", async () => {
    const html = await render(ReceiptEmail({ data: tournamentData }));
    expect(html).toBeTruthy();
    expect(html).toContain("賽事收據");
  });

  it("ORDER receipt contains item names", async () => {
    const html = await render(ReceiptEmail({ data: orderData }));
    expect(html).toContain("Pikachu");
    expect(html).toContain("Charizard");
  });

  it("ORDER receipt contains order ID", async () => {
    const html = await render(ReceiptEmail({ data: orderData }));
    expect(html).toContain("ORDER-AB");
  });

  it("TOURNAMENT receipt contains tournament title", async () => {
    const html = await render(ReceiptEmail({ data: tournamentData }));
    expect(html).toContain("Sunday Cup");
  });

  it("TOURNAMENT receipt contains player name", async () => {
    const html = await render(ReceiptEmail({ data: tournamentData }));
    expect(html).toContain("Alice Wong");
  });

  it("TOURNAMENT receipt contains location", async () => {
    const html = await render(ReceiptEmail({ data: tournamentData }));
    expect(html).toContain("Mong Kok Store");
  });
});
