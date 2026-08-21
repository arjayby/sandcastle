import { expect, test } from "@playwright/test";

test("the marketing shell supports phone and desktop visitors", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("heading", {
        name: "Go from a Brand Brief to a brand that is ready to ship.",
      }),
    ).toBeVisible();
  }
});

test("keyboard navigation has visible focus and usable targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  await page.keyboard.press("Tab");
  const homeLink = page.getByRole("link", { name: "Sandcastle home" });
  await expect(homeLink).toBeFocused();
  await expect(homeLink).toHaveCSS("outline-style", "solid");
  await expect(homeLink).toHaveCSS("outline-width", "3px");

  const navigationLinks = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link");
  for (const link of await navigationLinks.all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});
