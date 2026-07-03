import { Page } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

export async function loginAs(page: Page, role: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#login-email", `${role.toLowerCase()}@school.edu`);
  await page.fill("#login-password", "password123");
  await page.click("#login-submit");
  await page.waitForURL(/\/admin\/(dashboard|setup)/);
}

export async function loginAsDemo(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.click("#demo-login");
  await page.waitForURL(/\/admin\/dashboard/);
}

export async function waitForToast(page: Page) {
  await page.waitForSelector("text=/success|created|updated|deleted|error/i", { timeout: 5000 });
}

export const SELECTORS = {
  errorBanner: "text=/error|failed|unauthorized|forbidden|invalid/i",
  successBanner: "text=/success|created|updated/i",
  loading: '[class*="animate-spin"]',
};
