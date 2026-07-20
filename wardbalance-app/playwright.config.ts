import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next dev --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    env: {
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      AUTH_URL: "http://127.0.0.1:3000",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

