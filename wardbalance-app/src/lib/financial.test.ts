import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";
import { formatNaira } from "@/lib/utils";

// --- formatNaira tests ---

describe("formatNaira", () => {
  it("formats a positive integer", () => {
    expect(formatNaira(120000)).toBe("₦120,000");
  });

  it("formats a number with decimals", () => {
    expect(formatNaira(120000.5)).toBe("₦120,000.5");
  });

  it("formats a string number", () => {
    expect(formatNaira("150000")).toBe("₦150,000");
  });

  it("formats zero", () => {
    expect(formatNaira(0)).toBe("₦0");
  });

  it("formats a Decimal object", () => {
    const dec = new Decimal(250000);
    expect(formatNaira(dec)).toBe("₦250,000");
  });

  it("formats a Decimal object with decimals", () => {
    const dec = new Decimal("87500.75");
    expect(formatNaira(dec)).toBe("₦87,500.75");
  });

  it("returns ₦0 for NaN", () => {
    expect(formatNaira(NaN)).toBe("₦0");
  });

  it("returns ₦0 for undefined", () => {
    expect(formatNaira(undefined)).toBe("₦0");
  });

  it("returns ₦0 for null", () => {
    expect(formatNaira(null)).toBe("₦0");
  });

  it("returns ₦0 for an empty string", () => {
    expect(formatNaira("")).toBe("₦0");
  });

  it("formats a negative number", () => {
    expect(formatNaira(-5000)).toBe("₦-5,000");
  });

  it("handles string with non-numeric characters gracefully", () => {
    expect(formatNaira("abc")).toBe("₦0");
  });
});

// --- Decimal arithmetic patterns ---

describe("Decimal arithmetic for invoice calculations", () => {
  it("sums fee items correctly", () => {
    const items = [
      new Decimal(50000),
      new Decimal(25000),
      new Decimal(15000),
    ];
    const total = items.reduce((acc, item) => acc.plus(item), new Decimal(0));
    expect(total.equals(90000)).toBe(true);
    expect(total.toString()).toBe("90000");
  });

  it("calculates final amount = total - discount", () => {
    const totalAmount = new Decimal(100000);
    const discountAmount = new Decimal(10000);
    const finalAmount = totalAmount.minus(discountAmount);
    expect(finalAmount.equals(90000)).toBe(true);
  });

  it("calculates balance due = final amount - amount paid", () => {
    const finalAmount = new Decimal(100000);
    const amountPaid = new Decimal(35000);
    const balanceDue = finalAmount.minus(amountPaid);
    expect(balanceDue.equals(65000)).toBe(true);
  });

  it("handles zero balance due correctly", () => {
    const finalAmount = new Decimal(100000);
    const amountPaid = new Decimal(100000);
    const balanceDue = finalAmount.minus(amountPaid);
    expect(balanceDue.equals(0)).toBe(true);
  });

  it("avoids float precision issues with Decimal arithmetic", () => {
    const a = new Decimal("0.1");
    const b = new Decimal("0.2");
    const sum = a.plus(b);
    expect(sum.equals(0.3)).toBe(true);
    expect(sum.toString()).toBe("0.3");
  });

  it("calculates percentage discount correctly", () => {
    const baseAmount = new Decimal(200000);
    const discountPercent = 15;
    const discountAmount = baseAmount.times(discountPercent).dividedBy(100);
    expect(discountAmount.equals(30000)).toBe(true);
  });

  it("calculates fixed discount correctly", () => {
    const discountValue = new Decimal(25000);
    expect(discountValue.equals(25000)).toBe(true);
  });

  it("handles carryover addition correctly", () => {
    const feesAmount = new Decimal(150000);
    const carryoverAmount = new Decimal(12500);
    const totalExpected = feesAmount.plus(carryoverAmount);
    expect(totalExpected.equals(162500)).toBe(true);
  });

  it("handles decimal multiplication for taxes or adjustments", () => {
    const amount = new Decimal(5000);
    const rate = new Decimal("0.075");
    const result = amount.times(rate);
    expect(result.equals(375)).toBe(true);
  });
});

// --- Term ordering logic (extracted from generate/route.ts) ---

describe("Term ordering logic", () => {
  const termOrder = ["first", "second", "third", "fourth", "fifth"];

  function getTermWeight(name: string): number {
    const lower = name.toLowerCase();
    for (let i = 0; i < termOrder.length; i++) {
      if (lower.includes(termOrder[i])) return i;
    }
    return 99;
  }

  function getPreviousTerm(
    terms: { id: string; name: string; sessionName: string }[],
    currentTermId: string
  ): { id: string; name: string; sessionName: string } | null {
    if (terms.length === 0) return null;

    const sorted = [...terms].sort((a, b) => {
      const sessionComp = a.sessionName.localeCompare(b.sessionName);
      if (sessionComp !== 0) return sessionComp;
      return getTermWeight(a.name) - getTermWeight(b.name);
    });

    const currentIndex = sorted.findIndex((t) => t.id === currentTermId);
    if (currentIndex <= 0) return null;
    return sorted[currentIndex - 1];
  }

  it("identifies term weight correctly", () => {
    expect(getTermWeight("First Term")).toBe(0);
    expect(getTermWeight("Second Term")).toBe(1);
    expect(getTermWeight("Third Term")).toBe(2);
    expect(getTermWeight("fourth term")).toBe(3);
    expect(getTermWeight("fifth")).toBe(4);
  });

  it("returns 99 for unrecognised term names", () => {
    expect(getTermWeight("Summer Term")).toBe(99);
    expect(getTermWeight("")).toBe(99);
  });

  it("returns null when terms array is empty", () => {
    expect(getPreviousTerm([], "any-id")).toBeNull();
  });

  it("returns null when current term is the first term", () => {
    const terms = [
      { id: "t1", name: "First Term", sessionName: "2025/2026" },
    ];
    expect(getPreviousTerm(terms, "t1")).toBeNull();
  });

  it("returns previous term within same session", () => {
    const terms = [
      { id: "t1", name: "First Term", sessionName: "2025/2026" },
      { id: "t2", name: "Second Term", sessionName: "2025/2026" },
      { id: "t3", name: "Third Term", sessionName: "2025/2026" },
    ];
    const prev = getPreviousTerm(terms, "t2");
    expect(prev).not.toBeNull();
    expect(prev!.id).toBe("t1");
  });

  it("returns the last term of previous session when current is first term of new session", () => {
    const terms = [
      { id: "t1", name: "First Term", sessionName: "2024/2025" },
      { id: "t2", name: "Second Term", sessionName: "2024/2025" },
      { id: "t3", name: "Third Term", sessionName: "2024/2025" },
      { id: "t4", name: "First Term", sessionName: "2025/2026" },
    ];
    const prev = getPreviousTerm(terms, "t4");
    expect(prev).not.toBeNull();
    expect(prev!.id).toBe("t3");
  });

  it("returns null when current term is the only term", () => {
    const terms = [
      { id: "t1", name: "First Term", sessionName: "2025/2026" },
    ];
    expect(getPreviousTerm(terms, "t1")).toBeNull();
  });

  it("returns null when currentIndex is 0 (first in sorted order)", () => {
    const terms = [
      { id: "t1", name: "First Term", sessionName: "2024/2025" },
      { id: "t2", name: "First Term", sessionName: "2025/2026" },
    ];
    const prev = getPreviousTerm(terms, "t1");
    expect(prev).toBeNull();
  });
});

// --- Receipt number generation pattern ---

describe("Receipt number generation", () => {
  function generateReceiptNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REC-${dateStr}-${rand}`;
  }

  it("starts with REC- prefix", () => {
    const receipt = generateReceiptNumber();
    expect(receipt.startsWith("REC-")).toBe(true);
  });

  it("contains the date string in YYYYMMDD format", () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const receipt = generateReceiptNumber();
    expect(receipt).toContain(today);
  });

  it("has the correct segment count (REC-DATE-RANDOM)", () => {
    const receipt = generateReceiptNumber();
    const parts = receipt.split("-");
    expect(parts.length).toBe(3);
  });

  it("generates unique receipt numbers on successive calls", () => {
    const receipts = new Set<string>();
    for (let i = 0; i < 100; i++) {
      receipts.add(generateReceiptNumber());
    }
    expect(receipts.size).toBe(100);
  });

  it("generates random part of 4 uppercase alphanumeric characters", () => {
    const receipt = generateReceiptNumber();
    const randomPart = receipt.split("-")[2];
    expect(randomPart.length).toBe(4);
    expect(/^[A-Z0-9]+$/.test(randomPart)).toBe(true);
  });
});

// --- Invoice status transition logic ---

describe("Invoice status transitions", () => {
  function deriveStatus(
    amountPaid: Decimal,
    balanceDue: Decimal,
    currentStatus: string
  ): string {
    if (balanceDue.equals(0) && amountPaid.greaterThan(0)) {
      return "paid";
    }
    if (amountPaid.greaterThan(0) && balanceDue.greaterThan(0)) {
      return "partial";
    }
    if (amountPaid.equals(0) && balanceDue.greaterThan(0) && currentStatus === "paid") {
      return "issued";
    }
    return currentStatus;
  }

  it("remains draft when no payment and no discount change", () => {
    const status = deriveStatus(new Decimal(0), new Decimal(100000), "draft");
    expect(status).toBe("draft");
  });

  it("transitions to paid when balance reaches zero with payments", () => {
    const status = deriveStatus(new Decimal(100000), new Decimal(0), "partial");
    expect(status).toBe("paid");
  });

  it("transitions to partial when partial payment made", () => {
    const status = deriveStatus(new Decimal(30000), new Decimal(70000), "issued");
    expect(status).toBe("partial");
  });

  it("transitions to paid when full payment made in one go", () => {
    const status = deriveStatus(new Decimal(100000), new Decimal(0), "draft");
    expect(status).toBe("paid");
  });

  it("stays as is when status is explicitly provided", () => {
    const status = deriveStatus(new Decimal(0), new Decimal(0), "issued");
    expect(status).toBe("issued");
  });

  it("transitions back to issued when discount removes balance on a paid invoice with zero payments", () => {
    const status = deriveStatus(new Decimal(0), new Decimal(50000), "paid");
    expect(status).toBe("issued");
  });

  it("handles edge case of zero amount paid and zero balance due", () => {
    const status = deriveStatus(new Decimal(0), new Decimal(0), "draft");
    expect(status).toBe("draft");
  });
});

// --- Discount calculation ---

describe("Discount calculations", () => {
  it("calculates fixed discount correctly", () => {
    const discountValue = new Decimal(15000);
    expect(discountValue.equals(15000)).toBe(true);
  });

  it("calculates percentage discount of total baseline amount", () => {
    const lineItems = [
      { amount: new Decimal(50000), lineType: "fee_item" },
      { amount: new Decimal(25000), lineType: "fee_item" },
      { amount: new Decimal(10000), lineType: "fee_item" },
    ];

    const baseAmount = lineItems
      .filter((item) => item.lineType !== "discount")
      .reduce((acc, item) => acc.plus(item.amount), new Decimal(0));

    const discountPercent = 10;
    const discountAmount = baseAmount.times(discountPercent).dividedBy(100);

    expect(baseAmount.equals(85000)).toBe(true);
    expect(discountAmount.equals(8500)).toBe(true);
  });

  it("applies discount correctly to invoice amounts", () => {
    const totalAmount = new Decimal(100000);
    const discountAmount = new Decimal(10000);
    const finalAmount = totalAmount.minus(discountAmount);

    expect(finalAmount.equals(90000)).toBe(true);
    expect(totalAmount.minus(discountAmount).equals(finalAmount)).toBe(true);
  });

  it("handles discount exceeding total amount (edge case)", () => {
    const totalAmount = new Decimal(50000);
    const discountAmount = new Decimal(60000);
    const finalAmount = totalAmount.minus(discountAmount);

    expect(finalAmount.lessThan(0)).toBe(true);
    expect(finalAmount.equals(-10000)).toBe(true);
  });

  it("handles zero discount", () => {
    const totalAmount = new Decimal(75000);
    const discountAmount = new Decimal(0);
    const finalAmount = totalAmount.minus(discountAmount);

    expect(finalAmount.equals(75000)).toBe(true);
  });

  it("handles 100% discount correctly", () => {
    const totalAmount = new Decimal(100000);
    const discountPercent = 100;
    const discountAmount = totalAmount.times(discountPercent).dividedBy(100);

    expect(discountAmount.equals(100000)).toBe(true);
    expect(totalAmount.minus(discountAmount).equals(0)).toBe(true);
  });

  it("handles percentage discount with fractional percentage", () => {
    const totalAmount = new Decimal(200000);
    const discountPercent = 12.5;
    const discountAmount = totalAmount.times(discountPercent).dividedBy(100);

    expect(discountAmount.equals(25000)).toBe(true);
  });

  it("negated discount amount for line item representation", () => {
    const discountAmount = new Decimal(15000);
    const lineItemAmount = discountAmount.negated();
    expect(lineItemAmount.equals(-15000)).toBe(true);
  });
});
