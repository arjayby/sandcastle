import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3001";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${port}`,
    env: {
      VITE_BRAND_AGENT_PROVIDER: "controlled",
    },
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
