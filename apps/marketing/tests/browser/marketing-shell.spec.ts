import { expect, test } from "@playwright/test";

test("a Brand Builder can open the public Brand Brief from the hero", async ({
  page,
}) => {
  await page.goto("/");

  const action = page
    .getByRole("main")
    .getByRole("link", { name: "Build your Brand System" })
    .first();
  const productUrl = await action.getAttribute("href");

  if (!productUrl) {
    throw new Error("The hero action must have a product URL");
  }
  expect(new URL(productUrl).pathname).toBe("/new");

  await page.route(productUrl, async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<title>Brand Brief</title><h1>Start your Brand Brief</h1>",
    });
  });
  await action.click();

  await expect(page).toHaveURL(productUrl);
  await expect(
    page.getByRole("heading", { name: "Start your Brand Brief" }),
  ).toBeVisible();
});

test("a Brand Builder can move from the hero to a complete example Brand System", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("main")
    .getByRole("link", { name: "View an example" })
    .click();

  await expect(page).toHaveURL(/#example$/);
  const example = page.locator("#example");
  await expect(
    example.getByRole("heading", {
      name: "The complete Northstar Brand System",
    }),
  ).toBeVisible();

  for (const region of [
    "Logo",
    "Color",
    "Typography",
    "Voice and tone",
    "Photography",
    "Motion",
    "Interface foundation",
    "Design Tokens",
  ]) {
    await expect(example.getByRole("heading", { name: region })).toBeVisible();
  }
});

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
