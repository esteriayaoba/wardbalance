import { test, expect } from "@playwright/test";

test.describe("Financial Workflow API Enforcement", () => {
  test("POST /api/admin/fees/library requires valid amount (positive)", async ({ request }) => {
    const res = await request.post("/api/admin/fees/library", {
      data: { name: "Invalid Fee", amount: -5000, type: "mandatory", billingFrequency: "per_term" },
    });
    expect(res.status()).toBe(401); // Unauthenticated
  });

  test("POST /api/admin/fees/discounts requires authentication", async ({ request }) => {
    const res = await request.post("/api/admin/fees/discounts", {
      data: {
        name: "Test Discount", type: "fixed", value: 5000,
        condition: "manual", scope: "all_students",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("PUT /api/admin/invoices/[id] requires authentication for status change", async ({ request }) => {
    const res = await request.put("/api/admin/invoices/fake-id", {
      data: { status: "issued" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/students requires authentication", async ({ request }) => {
    const res = await request.post("/api/admin/students", {
      data: {
        firstName: "Test", lastName: "Student",
        admissionNumber: "TST-001",
        classLevelId: "x", classArmId: "y",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/parents requires authentication", async ({ request }) => {
    const res = await request.post("/api/admin/parents", {
      data: { firstName: "Test", lastName: "Parent", phone: "08000000000" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/parents/link requires authentication", async ({ request }) => {
    const res = await request.post("/api/admin/parents/link", {
      data: { parentId: "x", studentId: "y", relationshipType: "Father", isPrimaryContact: true },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/settings requires authentication", async ({ request }) => {
    const res = await request.post("/api/admin/settings", {
      data: { name: "Hacked School", address: "123", phone: "08000000000" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/students/import requires authentication", async ({ request }) => {
    const res = await request.post("/api/admin/students/import", {
      data: [{ firstName: "Test", lastName: "Student", admissionNumber: "IMP-001", classLevelName: "JSS1", classArmName: "A" }],
    });
    expect(res.status()).toBe(401);
  });
});
