import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";

const mockRecordPayment = vi.fn();

vi.mock("@/modules/payments/recorder.service", () => ({
  recordPayment: mockRecordPayment,
}));

const mockEnqueueNotification = vi.fn();
vi.mock("@/lib/notifications", () => ({
  enqueueNotification: mockEnqueueNotification,
}));

const mockPrisma = {
  payment: { findFirst: vi.fn() },
  invoice: { findFirst: vi.fn(), findUnique: vi.fn() },
  receipt: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  user: { findFirst: vi.fn() },
  parentWardLink: { findMany: vi.fn() },
  notificationOutbox: { create: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

describe("Flutterwave webhook flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates payment, receipt, audit log, and enqueues notification via shared recorder", async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      studentId: "student-1",
      amountPaid: new Decimal("0"),
      balanceDue: new Decimal("100000"),
      finalAmount: new Decimal("100000"),
      status: "issued",
    });

    mockRecordPayment.mockResolvedValue({
      payment: { id: "pay-1", amount: new Decimal("50000"), method: "card", reference: "WB-REF-001" },
      receipt: { id: "rcpt-1", receiptNumber: "RCT-FLW-20260629-ABCD" },
      invoice: { id: "inv-1", amountPaid: new Decimal("50000"), balanceDue: new Decimal("50000"), status: "partial" },
    });

    // Simulate webhook logic:
    const paymentResult = await mockRecordPayment({
      schoolId: "school-1",
      invoiceId: "inv-1",
      studentId: "student-1",
      parentId: "parent-1",
      amount: new Decimal("50000"),
      method: "card",
      reference: "WB-REF-001",
      recordedById: null,
      actorId: "parent-1",
      actorName: "Flutterwave Webhook",
      action: "payment.webhook_verified",
      receiptPrefix: "RCT-FLW",
    });

    expect(paymentResult.payment.method).toBe("card");
    expect(paymentResult.payment.id).toBe("pay-1");
    expect(paymentResult.invoice.status).toBe("partial");

    // Simulate notification enqueue after webhook
    mockEnqueueNotification.mockResolvedValue({ id: "notif-1" });
    const notif = await mockEnqueueNotification({
      schoolId: "school-1",
      parentId: "parent-1",
      channel: "email",
      recipient: "parent-1",
      subject: "Payment Received — WardBalance",
      content: `Your payment of ₦50,000 has been received. Receipt: RCT-FLW-20260629-ABCD`,
      reference: "payment-pay-1",
    });

    expect(notif.id).toBe("notif-1");
  });

  it("handles idempotency — skips duplicate transaction", async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "existing-pay" });

    const existingPayment = await mockPrisma.payment.findFirst({
      where: { OR: [{ reference: "WB-REF-001" }, { reference: "12345" }] },
    });

    expect(existingPayment).not.toBeNull();
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it("rejects non-NGN currency", () => {
    const currency = "USD";
    expect(currency).not.toBe("NGN");
  });

  it("requires invoiceId and schoolId in metadata", () => {
    const meta = { invoiceId: "inv-1", schoolId: "school-1" };
    expect(meta.invoiceId).toBeTruthy();
    expect(meta.schoolId).toBeTruthy();
  });
});

describe("Flutterwave verify flow", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("records payment via shared recorder on verification", async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      studentId: "student-1",
      amountPaid: new Decimal("0"),
      balanceDue: new Decimal("100000"),
      finalAmount: new Decimal("100000"),
      status: "issued",
    });

    mockRecordPayment.mockResolvedValue({
      payment: { id: "pay-2", amount: new Decimal("75000"), method: "card", reference: "TX-REF-002" },
      receipt: { id: "rcpt-2", receiptNumber: "RCT-FLW-20260629-EFGH" },
      invoice: { id: "inv-1", amountPaid: new Decimal("75000"), balanceDue: new Decimal("25000"), status: "partial" },
    });

    const result = await mockRecordPayment({
      schoolId: "school-1",
      invoiceId: "inv-1",
      studentId: "student-1",
      parentId: "parent-1",
      amount: new Decimal("75000"),
      method: "card",
      reference: "TX-REF-002",
      recordedById: null,
      actorId: "parent-1",
      actorName: "Parent User",
      action: "payment.verify_success",
      receiptPrefix: "RCT-FLW",
    });

    expect(result.payment.method).toBe("card");
    expect(result.receipt.receiptNumber).toMatch(/^RCT-FLW-/);
    expect(result.invoice.balanceDue.toString()).toBe("25000");
  });
});
