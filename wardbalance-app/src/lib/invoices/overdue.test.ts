import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";

const mockEnqueueNotification = vi.fn();
vi.mock("@/lib/notifications", () => ({ enqueueNotification: mockEnqueueNotification }));

const mockPrisma = {
  invoice: { findMany: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  auditLog: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/logger", () => ({ logError: vi.fn() }));

const { processOverdueInvoices, getOverdueStats } = await import("./overdue");

describe("processOverdueInvoices", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("marks issued/partial invoices as overdue when past due date", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    mockPrisma.invoice.findMany
      .mockResolvedValueOnce([
        { id: "inv-1", schoolId: "school-1", balanceDue: new Decimal("50000"), dueDate: pastDate, studentId: "student-1" },
        { id: "inv-2", schoolId: "school-1", balanceDue: new Decimal("75000"), dueDate: pastDate, studentId: "student-2" },
      ])
      .mockResolvedValueOnce([]);

    mockPrisma.invoice.update.mockResolvedValue({});

    const result = await processOverdueInvoices();

    expect(result.markedOverdue).toBe(2);
    expect(mockPrisma.invoice.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "invoice.marked_overdue" }),
      })
    );
  });

  it("does not mark invoices in locked terms", async () => {
    mockPrisma.invoice.findMany
      .mockResolvedValueOnce([]) // No phase 1 results (term locked filter)
      .mockResolvedValueOnce([]);

    const result = await processOverdueInvoices();
    expect(result.markedOverdue).toBe(0);
  });

  it("sends email and SMS reminders for overdue invoices", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const oldReminderDate = new Date();
    oldReminderDate.setDate(oldReminderDate.getDate() - 10);

    mockPrisma.invoice.findMany
      .mockResolvedValueOnce([]) // Phase 1: no new overdue marks
      .mockResolvedValueOnce([
        {
          id: "inv-1",
          schoolId: "school-1",
          balanceDue: new Decimal("50000"),
          dueDate: pastDate,
          school: { name: "Test School" },
          student: {
            firstName: "John", lastName: "Doe",
            parents: [
              {
                isPrimaryContact: true,
                receivesInvoiceNotifications: true,
                parent: { id: "parent-1", firstName: "Jane", email: "jane@test.com", phone: "08012345678" },
              },
            ],
          },
        },
      ]);

    const result = await processOverdueInvoices();

    expect(result.markedOverdue).toBe(0);
    expect(result.remindersQueued).toBe(2); // email + SMS
    expect(mockEnqueueNotification).toHaveBeenCalledTimes(2);
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "email", recipient: "jane@test.com" })
    );
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "sms", recipient: "08012345678" })
    );
  });

  it("skips reminders when parent has no email or phone", async () => {
    mockPrisma.invoice.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "inv-1",
          schoolId: "school-1",
          balanceDue: new Decimal("50000"),
          school: { name: "Test School" },
          student: {
            firstName: "John", lastName: "Doe",
            parents: [
              {
                isPrimaryContact: true,
                receivesInvoiceNotifications: true,
                parent: { id: "parent-1", firstName: "Jane", email: null, phone: null },
              },
            ],
          },
        },
      ]);

    const result = await processOverdueInvoices();
    expect(result.remindersQueued).toBe(0);
    expect(mockEnqueueNotification).not.toHaveBeenCalled();
  });
});

describe("getOverdueStats", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns overdue stats for a school", async () => {
    mockPrisma.invoice.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
    mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { balanceDue: new Decimal("250000") } });

    const stats = await getOverdueStats("school-1");

    expect(stats.overdueCount).toBe(5);
    expect(stats.overdueTotal).toBe("250000");
    expect(stats.pendingReminders).toBe(3);
  });
});
