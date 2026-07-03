import type { PrismaClient } from "@/generated/prisma/client";
import type { TournamentStatus } from "@/generated/prisma/enums";

/** Statuses set manually by an admin — never auto-overridden by time. */
const MANUAL_STATUSES = new Set(["DRAFT", "CANCELLED"]);

/**
 * Compute the effective status of a tournament based on Hong Kong time.
 *
 * Both `startsAt` and `now` are absolute UTC instants, so comparing them is
 * correct regardless of where the server runs — equivalent to comparing in
 * Asia/Hong_Kong (UTC+8), which is how admins enter start times.
 *
 *  - DRAFT / CANCELLED       → always preserved (manual override)
 *  - COMPLETED               → terminal: always preserved (manual or by time)
 *  - IN_PROGRESS             → advances to COMPLETED past the end, never reverts
 *  - OPEN / FULL (pre-event) → advance by time
 */
export function effectiveStatus(
  status: string,
  startsAt: Date | string,
  durationMinutes: number,
  now: Date = new Date(),
): string {
  if (MANUAL_STATUSES.has(status)) return status;

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + (durationMinutes || 0) * 60 * 1000);

  // Once completed (manually or by time), it stays completed — terminal.
  if (status === "COMPLETED") return "COMPLETED";

  // In progress only advances to completed past the end; never reverts.
  if (status === "IN_PROGRESS") {
    return now >= end ? "COMPLETED" : "IN_PROGRESS";
  }

  // OPEN / FULL (pre-event): advance by time.
  if (now >= end) return "COMPLETED";
  if (now >= start) return "IN_PROGRESS";
  return status; // OPEN or FULL
}

/**
 * Statuses an admin may move a tournament into, based on its current status.
 * The lifecycle (OPEN → IN_PROGRESS → COMPLETED) is driven automatically by
 * time; the admin's manual role is mainly to cancel (or un-cancel).
 */
export function allowedTransitions(current: string): string[] {
  switch (current) {
    case "OPEN":
      return ["OPEN", "CANCELLED"];
    case "FULL":
      return ["FULL", "CANCELLED"]; // full can be cancelled, not reopened to OPEN
    case "IN_PROGRESS":
      return ["IN_PROGRESS", "CANCELLED"];
    case "CANCELLED":
      return ["CANCELLED", "OPEN"];
    case "COMPLETED":
    default:
      return [current]; // completed is terminal — no manual change
  }
}

/**
 * Lazily sync stored tournament statuses with the current Hong Kong time.
 * Called on read (public + admin lists) so no separate cron job is needed.
 * Never throws — a failure here must not break listing tournaments.
 */
export async function syncTournamentStatuses(
  prisma: PrismaClient,
): Promise<void> {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
      select: { id: true, status: true, startsAt: true, durationMinutes: true },
    });

    const now = new Date();
    const updates: { id: string; status: string }[] = [];
    for (const t of tournaments) {
      const next = effectiveStatus(
        t.status,
        t.startsAt,
        t.durationMinutes,
        now,
      );
      if (next !== t.status) {
        updates.push({ id: t.id, status: next });
      }
    }

    if (updates.length === 0) return;

    await prisma.$transaction(
      updates.map((u) =>
        prisma.tournament.update({
          where: { id: u.id },
          data: { status: u.status as TournamentStatus },
        }),
      ),
    );
  } catch (error) {
    console.error("syncTournamentStatuses failed:", error);
  }
}
