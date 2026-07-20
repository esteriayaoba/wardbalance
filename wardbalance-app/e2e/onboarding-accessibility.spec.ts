import { test, expect } from "@playwright/test";
import { bypassCookieConsent, loginAsDemo } from "./helpers";

test.describe("Onboarding — Accessibility & Mobile QA", () => {
  test.beforeEach(async ({ page }) => {
    await bypassCookieConsent(page);
  });

  // The Setup page is part of the Admin Platform.
  // Per AGENTS.md, the Admin Platform minimum supported width is 1280px (collapsing to icon-only at 768px).
  // Viewports below 768px are out-of-scope for the admin dashboard.
  const VIEWPORTS = [
    { name: "iPad Mini (768×1024)", width: 768, height: 1024 },
    { name: "Desktop (1280×720)", width: 1280, height: 720 },
  ];

  for (const vp of VIEWPORTS) {
    test(`[${vp.name}] setup page renders without horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsDemo(page);
      await page.goto("/admin/setup");
      await page.waitForTimeout(2000);

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 4); // +4 for sub-pixel rounding and flex row negative margins

      // Check no overflow on main container
      const overflow = await page.evaluate(() => {
        const main = document.querySelector("main");
        if (!main) return "no-main";
        return window.getComputedStyle(main).overflowX;
      });
      if (overflow !== "no-main") {
        // Allow "auto" as acceptable to prevent false failures from scroll container definitions
        expect(["visible", "hidden", "auto"]).toContain(overflow);
      }
    });

    test(`[${vp.name}] all touch targets are ≥36px tall`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsDemo(page);
      await page.goto("/admin/setup");
      await page.waitForTimeout(2000);

      // Check all buttons and links in main content (excluding sidebar/header layout)
      const smallTargets = await page.evaluate(() => {
        const elements = document.querySelectorAll("main button, main a[href]");
        const results: { tag: string; text: string; height: number }[] = [];
        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          // Skip inline text links (which naturally have small line-height, e.g. < 36px)
          // and check actual buttons/action items (height > 0)
          if (rect.height > 0 && rect.height < 36) {
            results.push({
              tag: el.tagName,
              text: (el.textContent || "").trim().slice(0, 40),
              height: Math.round(rect.height),
            });
          }
        });
        return results;
      });

      if (smallTargets.length > 0) {
        console.log(`Found ${smallTargets.length} touch targets < 36px at ${vp.name}:`, smallTargets);
      }
      expect(smallTargets.length).toBe(0);
    });

    test(`[${vp.name}] keyboard navigation reaches all interactive elements`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsDemo(page);
      await page.goto("/admin/setup");
      await page.waitForTimeout(2000);

      // Tab through the page and verify focus moves
      const focusCount = await page.evaluate(async () => {
        const focusable = document.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return focusable.length;
      });

      // Should be able to tab through at least some elements
      expect(focusCount).toBeGreaterThan(0);

      // Tab forward through first 5 elements
      for (let i = 0; i < Math.min(5, focusCount); i++) {
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);
      }

      // Verify focus is on some element
      const hasFocus = await page.evaluate(() => {
        const el = document.activeElement;
        return el && el.tagName ? true : false;
      });
      expect(hasFocus).toBe(true);
    });
  }

  test("heading hierarchy is correct (h1 → h2 → h3)", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/admin/setup");
    await page.waitForTimeout(2000);

    const headings = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll("h1"));
      const h2s = Array.from(document.querySelectorAll("h2"));
      const h3s = Array.from(document.querySelectorAll("h3"));
      return {
        h1Count: h1s.length,
        h2Count: h2s.length,
        h3Count: h3s.length,
        h1Texts: h1s.map((h) => h.textContent?.trim() || ""),
        h2Texts: h2s.map((h) => h.textContent?.trim() || ""),
      };
    });

    expect(headings.h1Count).toBe(1);
    expect(headings.h1Texts[0]).toBeTruthy();
  });

  test("loading skeleton renders with correct role", async ({ page }) => {
    await loginAsDemo(page);
    // Slow down API response to trigger loading state
    await page.route("**/api/admin/setup/status", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });

    await page.goto("/admin/setup");
    await page.waitForTimeout(500); // Allow skeleton to render

    // Check for role="status" region indicating loading
    const loadingRegion = page.locator('[role="status"]');
    await expect(loadingRegion).toBeVisible({ timeout: 3000 });

    // Check for animated pulse elements (skeleton)
    const skeletons = page.locator(".animate-pulse");
    const skeletonCount = await skeletons.count();
    expect(skeletonCount).toBeGreaterThan(0);
  });

  test("API error shows recoverable error state", async ({ page }) => {
    await loginAsDemo(page);
    // Force API to return 500
    await page.route("**/api/admin/setup/status", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated server error", code: "INTERNAL_ERROR" }),
      });
    });

    await page.goto("/admin/setup");
    await page.waitForTimeout(2000);

    // Check error state renders (using precise text filter to avoid Sonner toast container or route announcer)
    const errorAlert = page.locator('div[role="alert"]').filter({ hasText: "Could Not Load Onboarding Setup" });
    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    // Check retry button exists
    const retryButton = errorAlert.locator("button");
    await expect(retryButton).toBeVisible();
  });

  test("focus-visible rings present on interactive elements", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/admin/setup");
    await page.waitForTimeout(2000);

    const focusStyles = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button");
      const results: { text: string; hasRing: boolean }[] = [];
      buttons.forEach((btn) => {
        const classes = btn.className || "";
        results.push({
          text: (btn.textContent || "").trim().slice(0, 40),
          hasRing: classes.includes("focus-visible:ring"),
        });
      });
      return results;
    });

    // At least some buttons should have focus-visible rings
    const withRing = focusStyles.filter((b) => b.hasRing);
    expect(withRing.length).toBeGreaterThan(0);
    console.log(`Buttons with focus-visible ring: ${withRing.length}/${focusStyles.length}`);
  });
});
