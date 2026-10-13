import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { defaultBoard, publishBoardInput, type BoardState } from "@/lib/tournament-board";

export const SHOP_BOARD_ID = "shop";

const defaultFilePath = path.join(process.cwd(), "data", "shop-board.json");

export type ShopBoardSnapshot = {
  board: BoardState;
  serverNow: number;
};

type ShopBoardAccess = {
  read(): Promise<BoardState>;
  write(state: BoardState): Promise<void>;
};

const ENSURE_TABLE = `
CREATE TABLE IF NOT EXISTS "ShopBoard" (
  "id" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopBoard_pkey" PRIMARY KEY ("id")
)`;

let singleton: ShopBoardAccess | null = null;
let tableReady: Promise<void> | null = null;

function parseStored(raw: string): BoardState {
  try {
    const parsed = JSON.parse(raw) as { board?: unknown } | unknown;
    if (parsed && typeof parsed === "object" && "board" in parsed) {
      return publishBoardInput(parsed.board);
    }
    return publishBoardInput(parsed);
  } catch {
    return defaultBoard();
  }
}

export function memoryShopBoard(): ShopBoardAccess {
  let state = defaultBoard();
  return {
    async read() {
      return state;
    },
    async write(next) {
      state = next;
    },
  };
}

export function fileShopBoard(filePath = defaultFilePath): ShopBoardAccess {
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(job: () => Promise<T>) => {
    const run = queue.then(job, job);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  return {
    read() {
      return enqueue(async () => {
        try {
          return parseStored(await readFile(filePath, "utf8"));
        } catch {
          return defaultBoard();
        }
      });
    },
    write(state) {
      return enqueue(async () => {
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify({ board: state }), "utf8");
      });
    },
  };
}

async function ensureShopBoardTable(prisma: PrismaClient) {
  if (!tableReady) {
    tableReady = prisma
      .$executeRawUnsafe(ENSURE_TABLE)
      .then(() => undefined)
      .catch((error: unknown) => {
        tableReady = null;
        throw error;
      });
  }
  await tableReady;
}

function databaseShopBoard(): ShopBoardAccess {
  return {
    async read() {
      const prisma = getPrisma();
      await ensureShopBoardTable(prisma);
      const row = await prisma.shopBoard.findUnique({ where: { id: SHOP_BOARD_ID } });
      if (!row) return defaultBoard();
      return publishBoardInput(row.state);
    },
    async write(state) {
      const prisma = getPrisma();
      await ensureShopBoardTable(prisma);
      const json = state as unknown as Prisma.InputJsonValue;
      await prisma.shopBoard.upsert({
        where: { id: SHOP_BOARD_ID },
        create: { id: SHOP_BOARD_ID, state: json },
        update: { state: json },
      });
    },
  };
}

function defaultAccess(): ShopBoardAccess {
  if (!singleton) {
    // Production uses Postgres. A local demo without DATABASE_URL uses one JSON file
    // so two browser tabs on this machine still share the board.
    singleton = isDatabaseConfigured() ? databaseShopBoard() : fileShopBoard();
  }
  return singleton;
}

export async function readShopBoard(now = Date.now()): Promise<ShopBoardSnapshot> {
  const stored = await defaultAccess().read();
  return { board: publishBoardInput(stored, now), serverNow: now };
}

export async function writeShopBoard(input: unknown, now = Date.now()): Promise<ShopBoardSnapshot> {
  const board = publishBoardInput(input, now);
  await defaultAccess().write(board);
  return { board, serverNow: now };
}
