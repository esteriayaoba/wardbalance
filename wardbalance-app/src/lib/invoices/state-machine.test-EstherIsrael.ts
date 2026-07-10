import { describe, it, expect } from "vitest";

// Replicate the state machine logic from invoices/[id]/route.ts
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["issued"],
  issued: ["partial", "paid", "overdue"],
  partial: ["paid", "overdue"],
  paid: [],
  overdue: ["paid"],
};

function validateStatusTransition(current: string, next: string | undefined): string | null {
  if (!next) return null;
  if (current === next) return null;
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed) return `Cannot transition from ${current}`;
  if (!allowed.includes(next)) {
    return `Cannot transition invoice from "${current}" to "${next}". Allowed transitions from "${current}": ${allowed.join(", ") || "none"}.`;
  }
  return null;
}

describe("Invoice Status State Machine", () => {
  it("allows draft to issued", () => {
    expect(validateStatusTransition("draft", "issued")).toBeNull();
  });

  it("blocks draft to paid (must go through issued)", () => {
    expect(validateStatusTransition("draft", "paid")).not.toBeNull();
  });

  it("blocks draft to partial (must go through issued)", () => {
    expect(validateStatusTransition("draft", "partial")).not.toBeNull();
  });

  it("blocks draft to overdue (must be issued first)", () => {
    expect(validateStatusTransition("draft", "overdue")).not.toBeNull();
  });

  it("blocks issued back to draft", () => {
    expect(validateStatusTransition("issued", "draft")).not.toBeNull();
  });

  it("allows issued to paid directly", () => {
    expect(validateStatusTransition("issued", "paid")).toBeNull();
  });

  it("allows issued to partial payment", () => {
    expect(validateStatusTransition("issued", "partial")).toBeNull();
  });

  it("allows issued to overdue", () => {
    expect(validateStatusTransition("issued", "overdue")).toBeNull();
  });

  it("allows partial to paid", () => {
    expect(validateStatusTransition("partial", "paid")).toBeNull();
  });

  it("allows partial to overdue", () => {
    expect(validateStatusTransition("partial", "overdue")).toBeNull();
  });

  it("allows overdue to paid", () => {
    expect(validateStatusTransition("overdue", "paid")).toBeNull();
  });

  it("blocks paid to any other status", () => {
    expect(validateStatusTransition("paid", "draft")).not.toBeNull();
    expect(validateStatusTransition("paid", "issued")).not.toBeNull();
    expect(validateStatusTransition("paid", "partial")).not.toBeNull();
    expect(validateStatusTransition("paid", "overdue")).not.toBeNull();
  });

  it("blocks overdue to draft", () => {
    expect(validateStatusTransition("overdue", "draft")).not.toBeNull();
  });

  it("blocks overdue to issued", () => {
    expect(validateStatusTransition("overdue", "issued")).not.toBeNull();
  });

  it("blocks overdue to partial", () => {
    expect(validateStatusTransition("overdue", "partial")).not.toBeNull();
  });

  it("allows no-op transition (same status)", () => {
    expect(validateStatusTransition("draft", "draft")).toBeNull();
    expect(validateStatusTransition("issued", "issued")).toBeNull();
    expect(validateStatusTransition("paid", "paid")).toBeNull();
  });

  it("returns null when no next status provided", () => {
    expect(validateStatusTransition("draft", undefined)).toBeNull();
    expect(validateStatusTransition("paid", undefined)).toBeNull();
  });
});
