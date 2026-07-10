import { test, expect } from "@playwright/test";
import { bypassCookieConsent, loginAsDemo, SELECTORS } from "./helpers";

test.describe("Admin Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await bypassCookieConsent(page);
  });

  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("shows login page with email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator("#login-submit")).toBeVisible();
    await expect(page.getByText("Sign In to Your Workspace")).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#login-email", "invalid@school.edu");
    await page.fill("#login-password", "wrongpassword");
    await page.click("#login-submit");
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test("demo login loads dashboard with expected elements", async ({ page }) => {
    await loginAsDemo(page);
    await expect(page.getByRole("heading", { name: /dashboard|overview/i })).toBeVisible();
  });

  test("logout button returns to login page", async ({ page }) => {
    await loginAsDemo(page);
    await page.click('button[title="Log out"]');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("unauthenticated access to setup redirects to login", async ({ page }) => {
    await page.goto("/admin/setup");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("authenticated admin accessing parent dashboard sees appropriate response", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/parent/dashboard");
    await page.waitForURL(/\//);
    expect(page.url()).not.toContain("/login");
  });
});
