import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";

const mockRecordPayment = vi.fn();

vi.mock("@/modules/payments/recorder.service", () => ({
  recordPayment: mockRecordPayment,
}));

const mockPrisma = {
  manualPaymentSubmission: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  invoice: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  payment: {
    create: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  receipt: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  parentWardLink: { findFirst: vi.fn() },
  notificationOutbox: { create: vi.fn() },
  $transaction: vi.fn().mockImplementation((cb: Function) => cb({
    invoice: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    manualPaymentSubmission: { findUnique: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn() },
    receipt: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  })),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/r2", () => ({
  getPresignedGetUrl: vi.fn().mockResolvedValue("https://cdn.example.com/proof.jpg"),
}));

// Import after mocking
const {
  fetchVerificationQueue,
  approvePaymentSubmission,
  rejectPaymentSubmission,
  requestReuploadSubmission,
  recordManualPayment,
} = await import("./payment-verification.service");

describe("fetchVerificationQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches submissions and enhances with proof URLs", async () => {
    const mockSubmissions = [
      {
        id: "sub-1",
        schoolId: "school-1",
        invoiceId: "inv-1",
        studentId: "student-1",
        parentId: "parent-1",
        amount: new Decimal("50000"),
        paymentMethod: "bank_transfer",
        reference: "REF-001",
        proofFileKey: "proofs/test.jpg",
        proofFileName: "test.jpg",
        proofFileType: "image/jpeg",
        status: "Pending",
        submittedAt: new Date(),
        student: {
          id: "student-1", firstName: "John", lastName: "Doe",
          admissionNumber: "ADM-001",
          classLevel: { name: "JSS1" },
          classArm: { name: "A" },
        },
        parent: { id: "parent-1", firstName: "Jane", lastName: "Doe", phone: "08012345678", email: "jane@test.com" },
        invoice: {
          id: "inv-1", status: "issued", dueDate: new Date(),
          finalAmount: new Decimal("100000"), amountPaid: new Decimal("0"), balanceDue: new Decimal("100000"),
          term: { name: "First Term" },
        },
      },
    ];

    mockPrisma.manualPaymentSubmission.findMany.mockResolvedValue(mockSubmissions);

    const result = await fetchVerificationQueue("school-1", "Pending");

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe("50000");
    expect(result[0].proofUrl).toBe("https://cdn.example.com/proof.jpg");
    expect(result[0].invoice.finalAmount).toBe("100000");
  });

  it("handles empty queue", async () => {
    mockPrisma.manualPaymentSubmission.findMany.mockResolvedValue([]);
    const result = await fetchVerificationQueue("school-1", "Approved");
    expect(result).toHaveLength(0);
  });
});

describe("approvePaymentSubmission", () => {
  const baseOptions = {
    schoolId: "school-1",
    actorId: "user-1",
    actorName: "Admin User",
    submissionId: "sub-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves a pending submission and updates invoice", async () => {
    const mockSubmission = {
      id: "sub-1",
      schoolId: "school-1",
      invoiceId: "inv-1",
      studentId: "student-1",
      parentId: "parent-1",
      amount: new Decimal("50000"),
      paymentMethod: "bank_transfer",
      reference: "REF-001",
      status: "Pending",
    };

    const mockInvoice = {
      id: "inv-1",
      status: "issued",
      amountPaid: new Decimal("0"),
      balanceDue: new Decimal("100000"),
      finalAmount: new Decimal("100000"),
      term: { status: "active" },
    };

    const mockUpdatedSubmission = { ...mockSubmission, status: "Approved" };

    mockRecordPayment.mockResolvedValue({
      payment: { id: "pay-1", amount: new Decimal("50000"), method: "bank_transfer", reference: "REF-001" },
      receipt: { id: "rcpt-1", receiptNumber: "REC-20260629-ABCD" },
      invoice: { id: "inv-1", amountPaid: new Decimal("50000"), balanceDue: new Decimal("50000"), status: "partial" },
    });

    const tx: any = {
      manualPaymentSubmission: { update: vi.fn().mockResolvedValue(mockUpdatedSubmission), findUnique: vi.fn().mockResolvedValue(mockSubmission) },
      invoice: { findUnique: vi.fn().mockResolvedValue(mockInvoice) },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));

    const result = await approvePaymentSubmission(baseOptions);

    expect(result.submission.status).toBe("Approved");
    expect(result.payment.id).toBe("pay-1");
    expect(result.receipt.id).toBe("rcpt-1");
    expect(result.invoice.status).toBe("partial");
    expect(mockRecordPayment).toHaveBeenCalled();
  });

  it("rejects if already reviewed", async () => {
    const mockSubmission = {
      id: "sub-1",
      invoiceId: "inv-1",
      amount: new Decimal("50000"),
      status: "Approved",
      paymentMethod: "bank_transfer",
    };

    const tx: any = {
      manualPaymentSubmission: {
        findUnique: vi.fn().mockResolvedValue(mockSubmission),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));

    await expect(approvePaymentSubmission(baseOptions)).rejects.toThrow(/already reviewed/i);
  });

  it("rejects if amount exceeds balance due", async () => {
    const mockSubmission = {
      id: "sub-1",
      invoiceId: "inv-1",
      amount: new Decimal("150000"),
      status: "Pending",
      paymentMethod: "bank_transfer",
    };

    const mockInvoice = {
      id: "inv-1",
      status: "issued",
      amountPaid: new Decimal("0"),
      balanceDue: new Decimal("100000"),
      finalAmount: new Decimal("100000"),
      term: { status: "active" },
    };

    const tx: any = {
      manualPaymentSubmission: { findUnique: vi.fn().mockResolvedValue(mockSubmission) },
      invoice: { findUnique: vi.fn().mockResolvedValue(mockInvoice) },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));

    await expect(approvePaymentSubmission(baseOptions)).rejects.toThrow(/exceeds/i);
  });
});

describe("rejectPaymentSubmission", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects a submission with reason", async () => {
    const tx: any = {
      manualPaymentSubmission: {
        update: vi.fn().mockResolvedValue({ id: "sub-1", status: "Rejected", rejectionReason: "Blurry proof" }),
      },
      auditLog: { create: vi.fn() },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));

    const result = await rejectPaymentSubmission({
      schoolId: "school-1", actorId: "user-1", actorName: "Admin",
      submissionId: "sub-1", reason: "Blurry proof",
    });

    expect(result.status).toBe("Rejected");
    expect(result.rejectionReason).toBe("Blurry proof");
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});

describe("requestReuploadSubmission", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("marks submission as ReuploadRequested", async () => {
    const tx: any = {
      manualPaymentSubmission: {
        update: vi.fn().mockResolvedValue({ id: "sub-1", status: "ReuploadRequested", reuploadReason: "Image too blurry" }),
      },
      auditLog: { create: vi.fn() },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));

    const result = await requestReuploadSubmission({
      schoolId: "school-1", actorId: "user-1", actorName: "Admin",
      submissionId: "sub-1", reason: "Image too blurry",
    });

    expect(result.status).toBe("ReuploadRequested");
    expect(result.reuploadReason).toBe("Image too blurry");
  });
});

describe("recordManualPayment", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("records a manual cash payment", async () => {
    const mockInvoice = {
      id: "inv-1",
      studentId: "student-1",
      term: { status: "active" },
      amountPaid: new Decimal("0"),
      balanceDue: new Decimal("100000"),
      finalAmount: new Decimal("100000"),
      status: "issued",
    };

    const tx = {
      invoice: { findFirst: vi.fn().mockResolvedValue(mockInvoice) },
      payment: { create: vi.fn() },
      receipt: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));
    mockPrisma.parentWardLink.findFirst.mockResolvedValue({ parentId: "parent-1" });

    mockRecordPayment.mockResolvedValue({
      payment: { id: "pay-1", amount: new Decimal("100000"), method: "cash", reference: null },
      receipt: { id: "rcpt-1", receiptNumber: "REC-TEST" },
      invoice: { id: "inv-1", amountPaid: new Decimal("100000"), balanceDue: new Decimal("0"), status: "paid" },
    });

    const result = await recordManualPayment({
      schoolId: "school-1",
      actorId: "user-1",
      actorName: "Admin",
      invoiceId: "inv-1",
      amount: new Decimal("100000"),
      method: "cash",
    });

    expect(result.payment.id).toBe("pay-1");
    expect(result.invoice.status).toBe("paid");
    expect(mockRecordPayment).toHaveBeenCalled();
  });

  it("rejects payment when term is locked", async () => {
    const tx = {
      invoice: { findFirst: vi.fn().mockResolvedValue({
        id: "inv-1",
        studentId: "student-1",
        term: { status: "locked" },
      })},
      payment: { create: vi.fn() },
      receipt: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));

    await expect(recordManualPayment({
      schoolId: "school-1", actorId: "user-1", actorName: "Admin",
      invoiceId: "inv-1", amount: new Decimal("50000"), method: "cash",
    })).rejects.toThrow(/locked/i);
  });
});
