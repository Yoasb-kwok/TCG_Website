import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/otp", () => ({
  generateOtp: vi.fn(() => "123456"),
  hashOtp: vi.fn(async () => "hashed-otp"),
  verifyOtp: vi.fn(async () => true),
  isExpired: vi.fn(() => false),
  OTP_EXPIRY_MS: 10 * 60 * 1000,
  OTP_MAX_ATTEMPTS: 5,
  OTP_LENGTH: 6,
}));

import { getPrisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import {
  listAccounts,
  updateProfile,
  initiateEmailChange,
  reverseEmailChange,
  issueEmailChangeOtp,
  verifyEmailChangeOtp,
  hasPendingEmailChange,
  softDeleteAccount,
  undeleteAccount,
  exportAccountsCsv,
} from "@/lib/accounts";

function mockPrisma() {
  const m = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    emailChangeRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    pointLedger: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // interactive transaction: pass the same mock through
  m.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(m),
  );
  vi.mocked(getPrisma).mockReturnValue(m as never);
  return m;
}

const USER = {
  id: "u-1",
  email: "old@test.com",
  name: "Alice",
  phone: "12345678",
  role: "USER",
  deletedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const PENDING_REQ = {
  id: "r-1",
  userId: "u-1",
  oldEmail: "old@test.com",
  newEmail: "new@test.com",
  otpHash: "hashed-otp",
  attempts: 0,
  expiresAt: new Date(Date.now() + 60_000),
  status: "PENDING",
  createdAt: new Date(),
  confirmedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyOtp).mockResolvedValue(true);
});

describe("listAccounts", () => {
  it("excludes admin accounts (role: USER filter)", async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([USER] as never);
    prisma.emailChangeRequest.findMany.mockResolvedValue([] as never);

    await listAccounts({});

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "USER" }),
      }),
    );
  });

  it("hides deleted accounts by default (deletedAt: null filter)", async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([USER] as never);
    prisma.emailChangeRequest.findMany.mockResolvedValue([] as never);

    await listAccounts({});

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it("includes deleted accounts when includeDeleted is true", async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([USER] as never);
    prisma.emailChangeRequest.findMany.mockResolvedValue([] as never);

    await listAccounts({ includeDeleted: true });

    const call = prisma.user.findMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("deletedAt");
  });

  it("q matches id, name, email, phone case-insensitively", async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([] as never);
    prisma.emailChangeRequest.findMany.mockResolvedValue([] as never);

    await listAccounts({ q: "alice" });

    const call = prisma.user.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { id: { contains: "alice", mode: "insensitive" } },
      { email: { contains: "alice", mode: "insensitive" } },
      { name: { contains: "alice", mode: "insensitive" } },
      { phone: { contains: "alice", mode: "insensitive" } },
    ]);
  });

  it("sorts newest first by default, oldest with sort=oldest", async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([] as never);
    prisma.emailChangeRequest.findMany.mockResolvedValue([] as never);

    await listAccounts({});
    await listAccounts({ sort: "oldest" });

    expect(prisma.user.findMany.mock.calls[0][0].orderBy).toEqual({
      createdAt: "desc",
    });
    expect(prisma.user.findMany.mock.calls[1][0].orderBy).toEqual({
      createdAt: "asc",
    });
  });

  it("flags accounts with a PENDING email change", async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([USER] as never);
    prisma.emailChangeRequest.findMany.mockResolvedValue([
      { userId: "u-1" },
    ] as never);

    const rows = await listAccounts({});

    expect(rows[0].pendingEmailChange).toBe(true);
  });
});

describe("updateProfile", () => {
  it("updates only the provided fields", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(USER as never);
    prisma.user.update.mockResolvedValue(USER as never);

    await updateProfile("u-1", { phone: "98765432" });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { phone: "98765432" },
    });
  });
});

describe("initiateEmailChange", () => {
  it("flips User.email and stores oldEmail in a PENDING request", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique
      .mockResolvedValueOnce(USER as never) // by id
      .mockResolvedValueOnce(null as never); // new email not in use
    prisma.emailChangeRequest.findUnique.mockResolvedValue(null as never);
    prisma.user.update.mockResolvedValue({ ...USER, email: "new@test.com" } as never);
    prisma.emailChangeRequest.upsert.mockResolvedValue(PENDING_REQ as never);

    await initiateEmailChange("u-1", "new@test.com");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { email: "new@test.com" },
    });
    expect(prisma.emailChangeRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "u-1",
          oldEmail: "old@test.com",
          newEmail: "new@test.com",
          status: "PENDING",
        }),
      }),
    );
  });

  it("rejects when the new email is already registered", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique
      .mockResolvedValueOnce(USER as never)
      .mockResolvedValueOnce({ id: "u-2" } as never);

    await expect(
      initiateEmailChange("u-1", "taken@test.com"),
    ).rejects.toThrow();
  });

  it("rejects when a PENDING request already exists", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValueOnce(USER as never).mockResolvedValueOnce(null as never);
    prisma.emailChangeRequest.findUnique.mockResolvedValue(PENDING_REQ as never);

    await expect(
      initiateEmailChange("u-1", "new@test.com"),
    ).rejects.toThrow();
  });

  it("rejects when the user is soft-deleted", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      ...USER,
      deletedAt: new Date(),
    } as never);

    await expect(
      initiateEmailChange("u-1", "new@test.com"),
    ).rejects.toThrow();
  });

  it("rejects when the new email equals the current email", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(USER as never);

    await expect(
      initiateEmailChange("u-1", "old@test.com"),
    ).rejects.toThrow();
  });

  it("rejects an invalid email format", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(USER as never);

    await expect(initiateEmailChange("u-1", "not-an-email")).rejects.toThrow();
  });
});

describe("reverseEmailChange", () => {
  it("restores the old email and marks the request REVERSED", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue(PENDING_REQ as never);
    prisma.user.update.mockResolvedValue(USER as never);
    prisma.emailChangeRequest.update.mockResolvedValue({
      ...PENDING_REQ,
      status: "REVERSED",
    } as never);

    await reverseEmailChange("u-1");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { email: "old@test.com" },
    });
    expect(prisma.emailChangeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REVERSED" }),
      }),
    );
  });

  it("throws when there is no PENDING request", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue(null as never);

    await expect(reverseEmailChange("u-1")).rejects.toThrow();
  });

  it("throws when the request is already CONFIRMED", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue({
      ...PENDING_REQ,
      status: "CONFIRMED",
    } as never);

    await expect(reverseEmailChange("u-1")).rejects.toThrow();
  });
});

describe("issueEmailChangeOtp", () => {
  it("generates an OTP, stores hash/expiry and resets attempts", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue(PENDING_REQ as never);
    prisma.emailChangeRequest.update.mockResolvedValue(PENDING_REQ as never);

    const result = await issueEmailChangeOtp("u-1");

    expect(result).toEqual({ code: "123456", newEmail: "new@test.com" });
    expect(prisma.emailChangeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u-1" },
        data: expect.objectContaining({
          otpHash: "hashed-otp",
          attempts: 0,
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it("throws when there is no PENDING request", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue(null as never);

    await expect(issueEmailChangeOtp("u-1")).rejects.toThrow();
  });
});

describe("verifyEmailChangeOtp", () => {
  it("on success: CONFIRMS the request and moves PointLedger old→new", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue(PENDING_REQ as never);
    prisma.emailChangeRequest.update.mockResolvedValue({} as never);
    prisma.pointLedger.updateMany.mockResolvedValue({ count: 3 } as never);
    prisma.user.findUnique.mockResolvedValue(USER as never);

    await verifyEmailChangeOtp("u-1", "123456");

    expect(prisma.emailChangeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CONFIRMED" }),
      }),
    );
    expect(prisma.pointLedger.updateMany).toHaveBeenCalledWith({
      where: { email: "old@test.com" },
      data: { email: "new@test.com" },
    });
  });

  it("on wrong code: increments attempts and throws", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue({
      ...PENDING_REQ,
      attempts: 1,
    } as never);
    prisma.emailChangeRequest.update.mockResolvedValue({} as never);
    vi.mocked(verifyOtp).mockResolvedValueOnce(false);

    await expect(verifyEmailChangeOtp("u-1", "000000")).rejects.toThrow();

    expect(prisma.emailChangeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attempts: 2 }),
      }),
    );
  });

  it("locks after OTP_MAX_ATTEMPTS (5) wrong attempts", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue({
      ...PENDING_REQ,
      attempts: 5,
    } as never);

    await expect(verifyEmailChangeOtp("u-1", "123456")).rejects.toThrow();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("throws on expired OTP", async () => {
    const prisma = mockPrisma();
    const { isExpired } = await import("@/lib/otp");
    vi.mocked(isExpired).mockReturnValueOnce(true);
    prisma.emailChangeRequest.findUnique.mockResolvedValue(PENDING_REQ as never);

    await expect(verifyEmailChangeOtp("u-1", "123456")).rejects.toThrow();
  });

  it("throws when no OTP has been requested yet", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue({
      ...PENDING_REQ,
      otpHash: null,
    } as never);

    await expect(verifyEmailChangeOtp("u-1", "123456")).rejects.toThrow();
  });
});

describe("hasPendingEmailChange", () => {
  it("true when the account has a PENDING request", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique.mockResolvedValue(PENDING_REQ as never);

    expect(await hasPendingEmailChange("u-1")).toBe(true);
  });

  it("false for CONFIRMED / REVERSED / none", async () => {
    const prisma = mockPrisma();
    prisma.emailChangeRequest.findUnique
      .mockResolvedValueOnce({ ...PENDING_REQ, status: "CONFIRMED" } as never)
      .mockResolvedValueOnce({ ...PENDING_REQ, status: "REVERSED" } as never)
      .mockResolvedValueOnce(null as never);

    expect(await hasPendingEmailChange("u-1")).toBe(false);
    expect(await hasPendingEmailChange("u-1")).toBe(false);
    expect(await hasPendingEmailChange("u-1")).toBe(false);
  });
});

describe("softDeleteAccount / undeleteAccount", () => {
  it("sets and clears deletedAt", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(USER as never);
    prisma.user.update.mockResolvedValue(USER as never);

    await softDeleteAccount("u-1");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    });

    await undeleteAccount("u-1");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { deletedAt: null },
    });
  });

  it("throws when the user does not exist", async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null as never);

    await expect(softDeleteAccount("nope")).rejects.toThrow();
    await expect(undeleteAccount("nope")).rejects.toThrow();
  });
});

describe("exportAccountsCsv", () => {
  it("returns CSV rows for the selected ids with dashboard columns", async () => {
    const prisma = mockPrisma();
    prisma.user.findMany.mockResolvedValue([USER] as never);

    const csv = await exportAccountsCsv(["u-1"]);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["u-1"] } } }),
    );
    expect(csv).toContain("id,name,email,phone,createdAt");
    expect(csv).toContain("old@test.com");
  });

  it("returns an empty string for no ids", async () => {
    mockPrisma();
    expect(await exportAccountsCsv([])).toBe("");
  });
});
