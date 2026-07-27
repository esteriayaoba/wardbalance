import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";

const mockRecordPayment = vi.hoisted(() => vi.fn());

vi.mock("@/modules/payments/recorder.service", () => ({
  recordPayment: mockRecordPayment,
}));

const mockPrisma = vi.hoisted(() => ({
  payment: { findFirst: vi.fn() },
  invoice: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { processFlutterwavePayment } from "@/services/flutterwave-webhook.service";

describe("Flutterwave webhook flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes payment via processFlutterwavePayment", async () => {
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.invoice.findFirst.mockResolvedValue({ id: "inv-1", studentId: "student-1" });
    mockRecordPayment.mockResolvedValue({
      payment: { id: "pay-1", amount: new Decimal("50000"), method: "bank_transfer", reference: "WB-REF-001" },
      receipt: { id: "rcpt-1", receiptNumber: "RCT-FLW-20260629-ABCD" },
      invoice: { id: "inv-1", amountPaid: new Decimal("50000"), balanceDue: new Decimal("50000"), status: "partial" },
    });

    const result = await processFlutterwavePayment({
      tx_ref: "WB-REF-001",
      id: 12345,
      amount: 50000,
      currency: "NGN",
      meta: { invoiceId: "inv-1", schoolId: "school-1", parentId: "parent-1" },
    });

    expect("duplicate" in result && result.duplicate).toBe(false);
    expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith({
      where: { reference: "WB-REF-001", schoolId: "school-1" },
    });
    expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
      where: { id: "inv-1", schoolId: "school-1" },
      select: { id: true, studentId: true },
    });
    expect(mockRecordPayment).toHaveBeenCalledTimes(1);
    const callArg = mockRecordPayment.mock.calls[0][0];
    expect(callArg.schoolId).toBe("school-1");
    expect(callArg.invoiceId).toBe("inv-1");
    expect(callArg.studentId).toBe("student-1");
    expect(callArg.parentId).toBe("parent-1");
    expect(callArg.amount.toString()).toBe("50000");
    expect(callArg.method).toBe("bank_transfer");
    expect(callArg.reference).toBe("WB-REF-001");
  });

  it("handles idempotency — skips duplicate transaction", async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "existing-pay" });

    const result = await processFlutterwavePayment({
      tx_ref: "WB-REF-001",
      id: 12345,
      amount: 50000,
      currency: "NGN",
      meta: { invoiceId: "inv-1", schoolId: "school-1", parentId: "parent-1" },
    });

    expect("duplicate" in result && result.duplicate).toBe(true);
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it("rejects non-existent invoice", async () => {
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    await expect(processFlutterwavePayment({
      tx_ref: "WB-REF-003",
      id: 67890,
      amount: 50000,
      currency: "NGN",
      meta: { invoiceId: "inv-notfound", schoolId: "school-1", parentId: "parent-1" },
    })).rejects.toThrow("Invoice not found");
  });
});
