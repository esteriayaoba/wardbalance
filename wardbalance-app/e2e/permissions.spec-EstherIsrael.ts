import { test, expect } from "@playwright/test";
import { bypassCookieConsent } from "./helpers";

const API_BASE = "/api/admin";

test.describe("Backend Permission Enforcement", () => {
  test("unauthenticated requests to fees return 401", async ({ request }) => {
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

  test("unauthenticated requests to students return 401", async ({ request }) => {
    const res = await request.post(`${API_BASE}/students`, {
      data: { firstName: "Test", lastName: "Student", admissionNumber: "TST-001", classLevelId: "x", classArmId: "y" },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated requests to parents return 401", async ({ request }) => {
    const res = await request.post(`${API_BASE}/parents`, {
      data: { firstName: "Test", lastName: "Parent", phone: "08000000000" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Authenticated API Access", () => {
  test.beforeEach(async ({ page }) => {
    await bypassCookieConsent(page);
  });

  test("demo user can GET fee items library", async ({ page, request }) => {
    // Log in via the page to establish auth session
    await page.goto("/login");
    await page.click("#demo-login");
    await page.waitForURL(/\/admin\/(dashboard|setup)/, { timeout: 15000 });

    // Use the shared session to make authenticated API requests
    const res = await request.get(`${API_BASE}/fees/library`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("demo user can GET invoices list", async ({ page, request }) => {
    await page.goto("/login");
    await page.click("#demo-login");
    await page.waitForURL(/\/admin\/(dashboard|setup)/, { timeout: 15000 });

    const res = await request.get(`${API_BASE}/invoices`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("demo user can GET students list", async ({ page, request }) => {
    await page.goto("/login");
    await page.click("#demo-login");
    await page.waitForURL(/\/admin\/(dashboard|setup)/, { timeout: 15000 });

    const res = await request.get(`${API_BASE}/students`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("demo user can GET dashboard stats", async ({ page, request }) => {
    await page.goto("/login");
    await page.click("#demo-login");
    await page.waitForURL(/\/admin\/(dashboard|setup)/, { timeout: 15000 });

    const res = await request.get(`${API_BASE}/dashboard/stats`);
    expect(res.status()).toBe(200);
  });
});
