# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flow.spec.ts >> Admin Authentication Flow >> demo login loads dashboard successfully
- Location: e2e\auth-flow.spec.ts:31:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - link "WardBalance logo WardBalance" [ref=e4] [cursor=pointer]:
      - /url: /
      - img "WardBalance logo" [ref=e5]
      - text: WardBalance
    - generic [ref=e6]:
      - generic [ref=e7]:
        - heading "Sign In to Your Workspace" [level=1] [ref=e8]
        - paragraph [ref=e9]: Enter your administrative credentials to manage your school's financial records.
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]:
            - generic [ref=e13]: Email Address
            - textbox "e.g. bursar@school.edu" [ref=e14]
          - generic [ref=e15]:
            - generic [ref=e16]:
              - generic [ref=e17]: Password
              - link "Forgot password?" [ref=e18] [cursor=pointer]:
                - /url: /forgot-password
            - generic [ref=e19]:
              - textbox "••••••••" [ref=e20]
              - button "Show password" [ref=e21] [cursor=pointer]:
                - img [ref=e22]
          - button "Signing In..." [disabled] [ref=e25]:
            - img [ref=e26]
            - text: Signing In...
        - generic [ref=e32]: or
        - button "Loading Demo..." [disabled] [ref=e33]:
          - img [ref=e34]
          - text: Loading Demo...
        - paragraph [ref=e36]: No account needed. Explore a fully-loaded demo school.
      - paragraph [ref=e37]:
        - text: Don't have an account?
        - link "Create a free workspace" [ref=e38] [cursor=pointer]:
          - /url: /signup
  - button "Open Next.js Dev Tools" [ref=e44] [cursor=pointer]:
    - generic [ref=e47]:
      - text: Rendering
      - generic [ref=e48]:
        - generic [ref=e49]: .
        - generic [ref=e50]: .
        - generic [ref=e51]: .
  - alert [ref=e52]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { bypassCookieConsent } from "./helpers";
  3  | 
  4  | test.describe("Admin Authentication Flow", () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await bypassCookieConsent(page);
  7  |   });
  8  | 
  9  |   test("redirects unauthenticated user to login", async ({ page }) => {
  10 |     await page.goto("/admin/dashboard");
  11 |     await page.waitForURL(/\/login/);
  12 |     expect(page.url()).toContain("/login");
  13 |   });
  14 | 
  15 |   test("shows login page with email and password fields", async ({ page }) => {
  16 |     await page.goto("/login");
  17 |     await expect(page.locator("#login-email")).toBeVisible();
  18 |     await expect(page.locator("#login-password")).toBeVisible();
  19 |     await expect(page.locator("#login-submit")).toBeVisible();
  20 |     await expect(page.getByText("Sign In to Your Workspace")).toBeVisible();
  21 |   });
  22 | 
  23 |   test("shows error for invalid credentials", async ({ page }) => {
  24 |     await page.goto("/login");
  25 |     await page.fill("#login-email", "invalid@school.edu");
  26 |     await page.fill("#login-password", "wrongpassword");
  27 |     await page.click("#login-submit");
  28 |     await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10000 });
  29 |   });
  30 | 
  31 |   test("demo login loads dashboard successfully", async ({ page }) => {
  32 |     await page.goto("/login");
  33 |     await page.click("#demo-login");
> 34 |     await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  35 |     await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  36 |   });
  37 | 
  38 |   test("logout button works", async ({ page }) => {
  39 |     await page.goto("/login");
  40 |     await page.click("#demo-login");
  41 |     await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
  42 |     await page.click('button[title="Log out"]');
  43 |     await page.waitForURL(/\/login/, { timeout: 10000 });
  44 |     await expect(page.locator("#login-email")).toBeVisible();
  45 |   });
  46 | });
  47 | 
  48 | 
```