import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";

const mockInvoice = {
  id: "inv-1",
  amountPaid: new Decimal("0"),
  balanceDue: new Decimal("100000"),
  finalAmount: new Decimal("100000"),
  status: "issued" as const,
};

const mockTx = {
  payment: { create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: "pay-1", method: args.data.method })) },
  invoice: {
    findUnique: vi.fn().mockResolvedValue(mockInvoice),
    update: vi.fn().mockResolvedValue({ ...mockInvoice, amountPaid: new Decimal("50000"), balanceDue: new Decimal("50000"), status: "partial" }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  receipt: { create: vi.fn().mockResolvedValue({ id: "rcpt-1", receiptNumber: "REC-20260629-ABCD" }) },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
};

const mockPrisma = {
  invoice: { findUnique: vi.fn().mockResolvedValue(mockInvoice) },
  payment: { create: vi.fn() },
  receipt: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { recordPayment } = await import("./payment-recorder.service");

describe("recordPayment", () => {
  const baseInput = {
    schoolId: "school-1",
    invoiceId: "inv-1",
    studentId: "student-1",
    parentId: "parent-1",
    amount: new Decimal("50000"),
    method: "bank_transfer" as const,
    reference: "REF-001",
    recordedById: "user-1",
    actorId: "user-1",
    actorName: "Admin",
    action: "PAYMENT_RECORDED",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a payment successfully within its own transaction", async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<any>) => {
      mockTx.invoice.findUnique
        .mockResolvedValueOnce(mockInvoice)
        .mockResolvedValueOnce({
          ...mockInvoice,
          amountPaid: new Decimal("50000"),
          balanceDue: new Decimal("50000"),
          status: "partial",
        });
      return cb(mockTx);
    });

    const result = await recordPayment(baseInput);

    expect(result.payment.id).toBe("pay-1");
    expect(result.receipt.receiptNumber).toMatch(/^REC-/);
    expect(result.invoice.status).toBe("partial");
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "PAYMENT_RECORDED" }),
      })
    );
  });

  it("records a card payment with Flutterwave prefix", async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<any>) => {
      mockTx.invoice.findUnique
        .mockResolvedValueOnce(mockInvoice)
        .mockResolvedValueOnce({
          ...mockInvoice,
          amountPaid: new Decimal("50000"),
          balanceDue: new Decimal("50000"),
          status: "partial",
        });
      return cb(mockTx);
    });

    const result = await recordPayment({
      ...baseInput,
      method: "card" as const,
      receiptPrefix: "RCT-FLW",
    });

    expect(result.payment.method).toBe("card");
    expect(result.receipt.receiptNumber).toMatch(/^RCT-FLW-/);
  });

  it("uses external transaction when provided", async () => {
    const result = await recordPayment({ ...baseInput, tx: mockTx as any });

    expect(result.payment.id).toBe("pay-1");
    expect(mockTx.payment.create).toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when amount exceeds balance due", async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<any>) => {
      mockTx.invoice.findUnique.mockResolvedValueOnce({
        ...mockInvoice,
        balanceDue: new Decimal("30000"),
      });
      return cb(mockTx);
    });

    await expect(recordPayment({
      ...baseInput,
      amount: new Decimal("50000"),
    })).rejects.toThrow(/exceeds/i);
  });

  it("marks invoice as paid when balance reaches zero", async () => {
    const paidTx = {
      ...mockTx,
      invoice: {
        ...mockTx.invoice,
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn()
          .mockResolvedValueOnce(mockInvoice)
          .mockResolvedValueOnce({
            ...mockInvoice,
            amountPaid: new Decimal("100000"),
            balanceDue: new Decimal("0"),
            status: "paid",
          }),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof paidTx) => Promise<any>) => {
      return cb(paidTx);
    });

    const result = await recordPayment({
      ...baseInput,
      amount: new Decimal("100000"),
    });

    expect(result.invoice.status).toBe("paid");
    expect(result.invoice.balanceDue.equals(0)).toBe(true);
  });

  it("rejects zero or negative amounts", async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<any>) => {
      mockTx.invoice.findUnique.mockResolvedValueOnce(mockInvoice);
      return cb(mockTx);
    });

    await expect(recordPayment({
      ...baseInput,
      amount: new Decimal("-100"),
    })).rejects.toThrow(/positive/i);
  });
});
