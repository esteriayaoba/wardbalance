import { test, expect } from "@playwright/test";

const API_BASE = "/api/admin";

test.describe("Backend Permission Enforcement", () => {
  test("unauthenticated requests return 401", async ({ request }) => {
    const res = await request.post(`${API_BASE}/fees/library`, {
      data: { name: "Test Fee", amount: 5000, type: "mandatory", billingFrequency: "per_term" },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated requests to invoices generate return 401", async ({ request }) => {
    const res = await request.post(`${API_BASE}/invoices/generate`, {
      data: { classLevelId: "x", termId: "y", dueDate: "2026-12-01" },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated requests to payment record return 401", async ({ request }) => {
    const res = await request.post(`${API_BASE}/payments`, {
      data: { invoiceId: "x", amount: 5000, method: "cash" },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated requests to settings return 401", async ({ request }) => {
    const res = await request.post(`${API_BASE}/settings`, {
      data: { name: "Test School", address: "123", phone: "08000000000" },
    });
    expect(res.status()).toBe(401);
  });
});
