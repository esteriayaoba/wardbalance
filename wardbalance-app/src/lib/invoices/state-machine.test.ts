import { describe, it, expect } from "vitest";

// Replicate the state machine logic from invoices/[id]/route.ts
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["issued"],
  issued: [],
  partial: [],
  paid: [],
  overdue: [],
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

  it("blocks issued to paid directly (must go through partial or full payment via service)", () => {
    expect(validateStatusTransition("issued", "paid")).not.toBeNull();
  });

  it("blocks paid to any other status", () => {
    expect(validateStatusTransition("paid", "draft")).not.toBeNull();
    expect(validateStatusTransition("paid", "issued")).not.toBeNull();
    expect(validateStatusTransition("paid", "partial")).not.toBeNull();
    expect(validateStatusTransition("paid", "overdue")).not.toBeNull();
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
