import { test, expect } from "@playwright/test";
import { bypassCookieConsent } from "./helpers";

test.describe("Onboarding & Signup Journey E2E", () => {
  test.beforeEach(async ({ page }) => {
    await bypassCookieConsent(page);
  });

  test("can successfully sign up and navigate setup wizard phases", async ({ page }) => {
    // 1. Visit signup and verify page elements
    await page.goto("/signup");
    await expect(page.locator("h1")).toContainText("Create Your School Workspace");

    // 2. Fill Step 1 (Account Info)
    const schoolName = `Test Academy ${Date.now()}`;
    const ownerEmail = `proprietor-${Date.now()}@wardbalance.local`;

    await page.fill('input[placeholder*="Royal Academy"]', schoolName);
    await page.fill('input[placeholder*="Babatunde"]', "Test Proprietor");
    await page.fill('input[placeholder*="proprietor"]', ownerEmail);
    await page.fill('input[placeholder*="+234"]', "+234 803 111 2222");
    
    // Fill password and verify strength panel updates
    await page.fill('input[placeholder="Create a strong password"]', "SecurePass123!");
    await page.fill('input[placeholder="Re-enter password"]', "SecurePass123!");
    
    // Check terms checkbox and proceed
    await page.locator('input[type="checkbox"]').check();
    await page.click('button:has-text("Next Step")');

    // 3. Step 2 (Quick Details)
    await expect(page.getByText("These details help us personalize your setup")).toBeVisible();
    await page.selectOption('select', 'Primary');
    await page.fill('input[type="number"]', "150");
    await page.click('button:has-text("Next Step")');

    // 4. Step 3 (Review Details)
    await expect(page.getByText("Review Your Details")).toBeVisible();
    await expect(page.getByText(schoolName)).toBeVisible();
    await expect(page.getByText(ownerEmail)).toBeVisible();
    
    // Submit creation
    await page.click('button:has-text("Create Free Account")');

    // 5. Step 4 (Aha Moment / Live Preview)
    // Wait for the simulated live dashboard preview to render
    await page.waitForURL(/\/signup/, { timeout: 15000 });
    await expect(page.getByText("Interactive demo")).toBeVisible();
    await expect(page.getByText("Workspace Live Preview")).toBeVisible();

    // Verify simulated figures exist
    await expect(page.getByText("₦12,450,000")).toBeVisible();
    await expect(page.getByText("₦8,230,000")).toBeVisible();

    // 6. Start Fresh path -> navigate to Setup Wizard
    await page.click('button:has-text("Start Fresh")');
    await page.waitForURL(/\/admin\/setup/, { timeout: 10000 });
    
    // Verify wizard page renders with progress elements
    await expect(page.getByRole("heading", { name: "Get Your School Ready" })).toBeVisible();
    await expect(page.getByText("Overall Progress")).toBeVisible();
  });
});
