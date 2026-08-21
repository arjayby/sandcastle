import { expect, test } from "@playwright/test";

test("the marketing sign in action opens the product sign in state", async ({
  page,
}) => {
  await page.goto("/dashboard?mode=sign-in");

  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("the public Brand Brief presents the shared Sandcastle identity", async ({
  page,
}) => {
  await page.goto("/");

  const homeLink = page.getByRole("link", { name: "Sandcastle home" });
  await expect(homeLink).toBeVisible();
  const symbol = homeLink.locator("img");
  await expect(symbol).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Create a complete Brand System.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Brief. Build. Refine. Ship.")).toBeVisible();

  const entrySurface = page.getByRole("main", { name: "Brand Canvas" });
  await expect(entrySurface).toHaveCSS(
    "background-color",
    "rgb(247, 243, 232)",
  );
  await expect(entrySurface).toHaveCSS("color", "rgb(32, 32, 30)");
  await expect(page.getByRole("button", { name: "Generate" })).toHaveCSS(
    "background-color",
    "rgb(244, 201, 93)",
  );

  const fontPreloads = page.locator('link[rel="preload"][as="font"]');
  await expect(fontPreloads).toHaveCount(3);
  const preloadUrls = await fontPreloads.evaluateAll((links) =>
    links.map((link) => (link as HTMLLinkElement).href),
  );
  expect(preloadUrls.every((url) => url.endsWith(".woff2"))).toBe(true);
  expect(
    preloadUrls.every((url) => !url.includes("fonts.googleapis.com")),
  ).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        await Promise.all(
          ["Instrument Serif", "Inter", "Geist Mono"].map((font) =>
            document.fonts.load(`16px "${font}"`),
          ),
        );
        return ["Instrument Serif", "Inter", "Geist Mono"].every((font) =>
          document.fonts.check(`16px "${font}"`),
        );
      }),
    )
    .toBe(true);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "type",
    "image/svg+xml",
  );

  const themeToggle = page.getByRole("button", { name: "Toggle theme" });
  await expect(themeToggle).toHaveCSS("transition-duration", "0.16s");
  const themeToggleBox = await themeToggle.boundingBox();
  expect(themeToggleBox?.width).toBeGreaterThanOrEqual(44);
  expect(themeToggleBox?.height).toBeGreaterThanOrEqual(44);
  await themeToggle.click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  await expect(symbol).toBeVisible();
  await expect(entrySurface).toHaveCSS("background-color", "rgb(32, 32, 30)");
  await expect(entrySurface).toHaveCSS("color", "rgb(247, 243, 232)");
});

test("the shared identity removes nonessential motion when requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.getByText("Brief. Build. Refine. Ship.")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(page.getByRole("button", { name: "Toggle theme" })).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
