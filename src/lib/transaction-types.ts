/**
 * ADR-003: Transaction Management System — Type Definitions
 *
 * Receipt data is a discriminated union (ADR-003 Decision 11).
 * The receipt template branches on `data.type` to render the appropriate layout.
 */

// ── Receipt Data (stored as JSON snapshot on Transaction.receiptData) ──────

export type OrderReceiptData = {
  type: "ORDER";
  orderId: string;
  email: string;
  items: {
    name: string;
    condition: string;
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  date: string;
};

export type TournamentReceiptData = {
  type: "TOURNAMENT";
  tournamentTitle: string;
  playerName: string;
  entryFee: number;
  startsAt: string;
  location: string;
  date: string;
};

export type ReceiptData = OrderReceiptData | TournamentReceiptData;

// ── Transaction Row (for admin dashboard display) ──────────────────────────

export type TransactionRow = {
  id: string;
  type: "ORDER" | "TOURNAMENT";
  referenceId: string;
  buyerType: "USER" | "GUEST";
  email: string;
  customerName: string | null;
  description: string;
  amount: number;
  status: string;
  remark: string | null;
  receiptData: ReceiptData | null;
  createdAt: string;
};

// ── Status options per transaction type (ADR-003 Decision 9) ───────────────

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
  "NOT_REQUIRED",
] as const;

export const TOURNAMENT_STATUSES = [
  "PENDING",
  "PAID",
  "CANCELLED",
  "FAILED",
  "NOT_REQUIRED",
] as const;

/**
 * Returns the valid status options for a given transaction type.
 * Tournaments exclude SHIPPED and COMPLETED (ADR-003 Decision 9).
 */
export function getStatusOptions(type: "ORDER" | "TOURNAMENT"): readonly string[] {
  return type === "ORDER" ? ORDER_STATUSES : TOURNAMENT_STATUSES;
}

/**
 * Display name for a customer — falls back to email for guests
 * (ADR-003 Decision 13).
 */
export function getDisplayName(transaction: {
  customerName: string | null;
  email: string;
}): string {
  return transaction.customerName ?? transaction.email;
}

// ── Type guard helpers ─────────────────────────────────────────────────────

export function isOrderReceipt(
  data: ReceiptData,
): data is OrderReceiptData {
  return data.type === "ORDER";
}

export function isTournamentReceipt(
  data: ReceiptData,
): data is TournamentReceiptData {
  return data.type === "TOURNAMENT";
}
