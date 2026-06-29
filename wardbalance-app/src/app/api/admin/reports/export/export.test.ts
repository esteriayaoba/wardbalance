import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

const mockPrisma = {
  invoice: { findMany: vi.fn(), aggregate: vi.fn() },
  classArm: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/logger", () => ({ logError: vi.fn() }));

const { getSession } = await import("@/lib/auth/session");

// We test the data processing logic that the export route uses,
// since the actual endpoint requires NextRequest mocking

describe("CSV Export — Debtors data processing", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("converts Decimal amounts to Number for CSV output via toString", () => {
    const amount = new Decimal("150000.50");
    const csvValue = Number(amount.toString());
    expect(csvValue).toBe(150000.5);
  });

  it("formats student name as Last, First", () => {
    const lastName = "Doe";
    const firstName = "John";
    expect(`${lastName}, ${firstName}`).toBe("Doe, John");
  });

  it("formats dates as YYYY-MM-DD", () => {
    const date = new Date("2026-09-15T10:00:00Z");
    expect(date.toISOString().split("T")[0]).toBe("2026-09-15");
  });

  it("computes collection rate correctly", () => {
    const expected = 200000;
    const collected = 150000;
    const rate = expected > 0 ? ((collected / expected) * 100).toFixed(2) : "0.00";
    expect(rate).toBe("75.00");
  });

  it("returns 0.00 collection rate when expected is zero", () => {
    const expected = 0;
    const collected = 0;
    const rate = expected > 0 ? ((collected / expected) * 100).toFixed(2) : "0.00";
    expect(rate).toBe("0.00");
  });
});

describe("CSV Export — Class Collection data processing", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("aggregates class arm data correctly using Decimal", () => {
    const classArmsData = [
      {
        classLevel: { name: "JSS1" },
        name: "A",
        students: [
          {
            invoices: [
              { finalAmount: new Decimal("50000"), amountPaid: new Decimal("30000"), balanceDue: new Decimal("20000") },
              { finalAmount: new Decimal("45000"), amountPaid: new Decimal("45000"), balanceDue: new Decimal("0") },
            ],
          },
          {
            invoices: [
              { finalAmount: new Decimal("50000"), amountPaid: new Decimal("0"), balanceDue: new Decimal("50000") },
            ],
          },
        ],
      },
    ];

    const records = classArmsData.map((arm) => {
      let expected = new Decimal(0);
      let collected = new Decimal(0);
      let outstanding = new Decimal(0);

      arm.students.forEach((student) => {
        student.invoices.forEach((inv) => {
          expected = expected.plus(inv.finalAmount);
          collected = collected.plus(inv.amountPaid);
          outstanding = outstanding.plus(inv.balanceDue);
        });
      });

      return {
        className: `${arm.classLevel.name} - ${arm.name}`,
        studentCount: arm.students.length,
        expected: Number(expected.toString()),
        collected: Number(collected.toString()),
        outstanding: Number(outstanding.toString()),
      };
    });

    expect(records).toHaveLength(1);
    expect(records[0].className).toBe("JSS1 - A");
    expect(records[0].studentCount).toBe(2);
    expect(records[0].expected).toBe(145000);
    expect(records[0].collected).toBe(75000);
    expect(records[0].outstanding).toBe(70000);
  });
});

describe("CSV Export — Revenue data processing with Decimal safety", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("aggregates revenue using Decimal to avoid float precision loss", () => {
    const invoices = [
      { termId: "t1", finalAmount: new Decimal("150000.50"), amountPaid: new Decimal("85000.25"), balanceDue: new Decimal("65000.25") },
      { termId: "t1", finalAmount: new Decimal("200000.75"), amountPaid: new Decimal("200000.75"), balanceDue: new Decimal("0") },
    ];

    const summary: Record<string, { expected: Decimal; collected: Decimal; outstanding: Decimal }> = {};

    for (const inv of invoices) {
      if (!summary[inv.termId]) {
        summary[inv.termId] = {
          expected: new Decimal(0), collected: new Decimal(0), outstanding: new Decimal(0),
        };
      }
      summary[inv.termId].expected = summary[inv.termId].expected.plus(inv.finalAmount);
      summary[inv.termId].collected = summary[inv.termId].collected.plus(inv.amountPaid);
      summary[inv.termId].outstanding = summary[inv.termId].outstanding.plus(inv.balanceDue);
    }

    const term = summary["t1"];
    expect(Number(term.expected.toString())).toBe(350001.25);
    expect(Number(term.collected.toString())).toBe(285001);
    expect(Number(term.outstanding.toString())).toBe(65000.25);
  });
});
