import { test, expect } from "@playwright/test";

test.describe("Admin Authentication Flow", () => {
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

  test("demo login loads dashboard successfully", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-login");
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("logout button works", async ({ page }) => {
    await page.goto("/login");
    await page.click("#demo-login");
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
    await page.click("text=Logout");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator("#login-email")).toBeVisible();
  });
});
