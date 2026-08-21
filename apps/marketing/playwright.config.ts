import { defineConfig } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "4322";

export default defineConfig({
  testDir: "./tests/browser",
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: [
    {
      command: `pnpm exec vite preview --host 127.0.0.1 --port ${port}`,
      reuseExistingServer: false,
      url: `http://127.0.0.1:${port}`,
    },
    {
      command:
        "VITE_CONVEX_URL=https://test.convex.cloud VITE_CONVEX_SITE_URL=https://test.convex.site pnpm --dir ../web dev --host 127.0.0.1 --port 5173",
      reuseExistingServer: false,
      url: "http://localhost:5173/new",
    },
  ],
});
