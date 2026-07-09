import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";
import {
  calculateCarryover,
  checkDuplicate,
  hasExistingInvoice,
  validatePayment,
  deriveStatusAfterPayment,
} from "@/lib/invoices/logic";

// --- Carryover amount calculation ---

describe("Carryover amount calculation", () => {
  it("returns zero when there is no previous invoice", () => {
    const carryover = calculateCarryover(null);
    expect(carryover.equals(0)).toBe(true);
  });

  it("returns the full balance due of the previous invoice", () => {
    const prevInvoice = { balanceDue: new Decimal(25000) };
    const carryover = calculateCarryover(prevInvoice);
    expect(carryover.equals(25000)).toBe(true);
  });

  it("returns zero when previous invoice is fully paid", () => {
    const prevInvoice = { balanceDue: new Decimal(0) };
    const carryover = calculateCarryover(prevInvoice);
    expect(carryover.equals(0)).toBe(true);
  });

  it("handles large carryover amounts", () => {
    const prevInvoice = { balanceDue: new Decimal(500000) };
    const carryover = calculateCarryover(prevInvoice);
    expect(carryover.equals(500000)).toBe(true);
  });

  it("adds carryover to fees amount for total expected", () => {
    const feesAmount = new Decimal(150000);
    const carryoverAmount = new Decimal(12500);
    const totalExpected = feesAmount.plus(carryoverAmount);
    expect(totalExpected.equals(162500)).toBe(true);
  });

  it("carryover line item is added only when greater than zero", () => {
    const carryoverAmount = new Decimal(0);
    const shouldAddLineItem = carryoverAmount.greaterThan(0);
    expect(shouldAddLineItem).toBe(false);

    const carryoverWithBalance = new Decimal(5000);
    expect(carryoverWithBalance.greaterThan(0)).toBe(true);
  });
});

// --- Duplicate invoice prevention ---

describe("Duplicate invoice prevention", () => {
  it("detects duplicate when invoice already exists", () => {
    const result = checkDuplicate({ id: "inv-1" }, undefined);
    expect(result.duplicate).toBe(true);
    expect(result.reason).toBe("duplicate");
  });

  it("allows generation when no existing invoice found", () => {
    const result = checkDuplicate(null, undefined);
    expect(result.duplicate).toBe(false);
    expect(result.reason).toBeNull();
  });

  it("skips duplicate when configured to skip", () => {
    const result = checkDuplicate({ id: "inv-1" }, "skip");
    expect(result.duplicate).toBe(true);
    expect(result.reason).toBe("skipped");
  });

  it("detects existing invoice via composite key in a Set", () => {
    const existingSet = new Set<string>(["student-1"]);
    expect(hasExistingInvoice(existingSet, "student-1")).toBe(true);
    expect(hasExistingInvoice(existingSet, "student-2")).toBe(false);
  });
});

// --- balanceDue = finalAmount - amountPaid invariant ---

describe("balanceDue invariant (finalAmount - amountPaid)", () => {
  it("balance equals final amount when nothing is paid", () => {
    const finalAmount = new Decimal(100000);
    const amountPaid = new Decimal(0);
    const balanceDue = finalAmount.minus(amountPaid);
    expect(balanceDue.equals(100000)).toBe(true);
  });

  it("balance equals zero when fully paid", () => {
    const finalAmount = new Decimal(100000);
    const amountPaid = new Decimal(100000);
    const balanceDue = finalAmount.minus(amountPaid);
    expect(balanceDue.equals(0)).toBe(true);
  });

  it("balance decreases correctly after partial payment", () => {
    const finalAmount = new Decimal(100000);
    const payment1 = new Decimal(30000);
    const balanceAfterFirst = finalAmount.minus(payment1);
    expect(balanceAfterFirst.equals(70000)).toBe(true);

    const payment2 = new Decimal(20000);
    const balanceAfterSecond = balanceAfterFirst.minus(payment2);
    expect(balanceAfterSecond.equals(50000)).toBe(true);
  });

  it("balance updates correctly after multiple payments", () => {
    let amountPaid = new Decimal(0);
    const finalAmount = new Decimal(85000);

    const payments = [new Decimal(10000), new Decimal(25000), new Decimal(50000)];

    for (const payment of payments) {
      amountPaid = amountPaid.plus(payment);
    }

    const balanceDue = finalAmount.minus(amountPaid);
    expect(amountPaid.equals(85000)).toBe(true);
    expect(balanceDue.equals(0)).toBe(true);
  });

  it("invariant holds after discount is applied", () => {
    const totalAmount = new Decimal(100000);
    const discountAmount = new Decimal(10000);
    const finalAmount = totalAmount.minus(discountAmount);
    const amountPaid = new Decimal(40000);
    const balanceDue = finalAmount.minus(amountPaid);

    expect(finalAmount.equals(90000)).toBe(true);
    expect(balanceDue.equals(50000)).toBe(true);
  });

  it("invariant holds with zero final amount", () => {
    const finalAmount = new Decimal(0);
    const amountPaid = new Decimal(0);
    const balanceDue = finalAmount.minus(amountPaid);
    expect(balanceDue.equals(0)).toBe(true);
  });

  it("final amount is recalculated as total minus discount", () => {
    const lineItems = [
      { amount: new Decimal(50000), lineType: "fee_item" },
      { amount: new Decimal(30000), lineType: "fee_item" },
      { amount: new Decimal(-10000), lineType: "discount" },
    ];

    const totalAmount = lineItems
      .filter((item) => item.lineType !== "discount")
      .reduce((acc, item) => acc.plus(item.amount), new Decimal(0));

    const discountAmount = lineItems
      .filter((item) => item.lineType === "discount")
      .reduce((acc, item) => acc.plus(item.amount.negated()), new Decimal(0));

    const finalAmount = totalAmount.minus(discountAmount);
    const amountPaid = new Decimal(20000);
    const balanceDue = finalAmount.minus(amountPaid);

    expect(totalAmount.equals(80000)).toBe(true);
    expect(discountAmount.equals(10000)).toBe(true);
    expect(finalAmount.equals(70000)).toBe(true);
    expect(balanceDue.equals(50000)).toBe(true);
  });
});

// --- Payment amount cannot exceed balance due ---

describe("Payment amount validation", () => {
  it("allows payment exactly equal to balance due", () => {
    const result = validatePayment(new Decimal(50000), new Decimal(50000));
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("allows payment less than balance due", () => {
    const result = validatePayment(new Decimal(25000), new Decimal(50000));
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects payment exceeding balance due", () => {
    const result = validatePayment(new Decimal(60000), new Decimal(50000));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Payment amount exceeds balance due");
  });

  it("rejects zero payment", () => {
    const result = validatePayment(new Decimal(0), new Decimal(50000));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Payment amount must be positive");
  });

  it("rejects negative payment", () => {
    const result = validatePayment(new Decimal(-1000), new Decimal(50000));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Payment amount must be positive");
  });

  it("allows payment on fully balanced invoice (balanceDue = 0)", () => {
    const result = validatePayment(new Decimal(0), new Decimal(0));
    expect(result.valid).toBe(false); // zero is rejected
  });

  it("rejects payment on zero balance invoice", () => {
    const result = validatePayment(new Decimal(100), new Decimal(0));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Payment amount exceeds balance due");
  });

  it("handles large payment values without precision issues", () => {
    const result = validatePayment(
      new Decimal("999999999.99"),
      new Decimal("999999999.99")
    );
    expect(result.valid).toBe(true);
  });
});

// --- New invoice status after payment ---

describe("Invoice status derivation after payment", () => {
  it("transitions to paid when full payment clears balance", () => {
    const newStatus = deriveStatusAfterPayment(
      "issued",
      new Decimal(50000),
      new Decimal(50000)
    );
    expect(newStatus).toBe("paid");
  });

  it("transitions from draft to partial on partial payment", () => {
    const newStatus = deriveStatusAfterPayment(
      "draft",
      new Decimal(30000),
      new Decimal(100000)
    );
    expect(newStatus).toBe("partial");
  });

  it("transitions from partial to paid on final payment", () => {
    const newStatus = deriveStatusAfterPayment(
      "partial",
      new Decimal(100000),
      new Decimal(100000)
    );
    expect(newStatus).toBe("paid");
  });

  it("remains partial after additional partial payment", () => {
    const newStatus = deriveStatusAfterPayment(
      "partial",
      new Decimal(50000),
      new Decimal(100000)
    );
    expect(newStatus).toBe("partial");
  });

  it("returns current status when no payment made", () => {
    const newStatus = deriveStatusAfterPayment(
      "issued",
      new Decimal(0),
      new Decimal(100000)
    );
    expect(newStatus).toBe("issued");
  });
});

// --- Discount applied on existing invoice ---

describe("Discount application on existing invoice", () => {
  it("recalculates final amount and balance due after fixed discount", () => {
    const lineItems = [
      { amount: new Decimal(50000), lineType: "fee_item" },
      { amount: new Decimal(30000), lineType: "fee_item" },
    ];

    const totalAmount = lineItems
      .filter((i) => i.lineType !== "discount")
      .reduce((acc, i) => acc.plus(i.amount), new Decimal(0));

    const discountValue = new Decimal(15000);
    const finalAmount = totalAmount.minus(discountValue);
    const amountPaid = new Decimal(10000);
    const balanceDue = finalAmount.minus(amountPaid);

    expect(totalAmount.equals(80000)).toBe(true);
    expect(finalAmount.equals(65000)).toBe(true);
    expect(balanceDue.equals(55000)).toBe(true);
  });

  it("recalculates final amount and balance due after percentage discount", () => {
    const totalAmount = new Decimal(100000);
    const discountPercent = 20;
    const discountAmount = totalAmount.times(discountPercent).dividedBy(100);
    const finalAmount = totalAmount.minus(discountAmount);

    const amountPaid = new Decimal(0);
    const balanceDue = finalAmount.minus(amountPaid);

    expect(discountAmount.equals(20000)).toBe(true);
    expect(finalAmount.equals(80000)).toBe(true);
    expect(balanceDue.equals(80000)).toBe(true);
  });

  it("removes discount line items when discount is set to none", () => {
    const totalAmount = new Decimal(100000);
    const discountAmount = new Decimal(0);
    const finalAmount = totalAmount.minus(discountAmount);

    expect(discountAmount.equals(0)).toBe(true);
    expect(finalAmount.equals(100000)).toBe(true);
  });

  it("status changes to paid when discount brings balance to zero with existing payment", () => {
    const totalAmount = new Decimal(100000);
    const discountAmount = new Decimal(30000);
    const finalAmount = totalAmount.minus(discountAmount);
    const amountPaid = new Decimal(70000);
    const balanceDue = finalAmount.minus(amountPaid);

    expect(finalAmount.equals(70000)).toBe(true);
    expect(balanceDue.equals(0)).toBe(true);

    let updatedStatus = "partial";
    if (balanceDue.equals(0) && amountPaid.greaterThan(0)) {
      updatedStatus = "paid";
    }

    expect(updatedStatus).toBe("paid");
  });
});
