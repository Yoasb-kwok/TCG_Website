/**
 * ADR-004 Decision 2: Points are integers, 1 point per HKD 1, Math.floor.
 *
 * This file is safe to import from client components (no Prisma/Node.js deps).
 * The server-side service in `src/lib/points.ts` re-exports this constant.
 */
export const POINTS_RATE = 1;
