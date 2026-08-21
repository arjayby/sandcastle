import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function expectActionOpensPublicBrandBrief(page: Page, action: Locator) {
  const marketingOrigin = new URL(page.url()).origin;
  const productUrl = await action.getAttribute("href");

  if (!productUrl) {
    throw new Error("The action must have a product URL");
  }
  expect(new URL(productUrl).origin).not.toBe(marketingOrigin);
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
}

test("a Brand Builder can open the public Brand Brief from the hero", async ({
  page,
}) => {
  await page.goto("/");

  const heroBrandSystemLink = page
    .getByRole("main")
    .getByRole("link", { name: "Build your Brand System" })
    .first();

  await expectActionOpensPublicBrandBrief(page, heroBrandSystemLink);
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

test("a Brand Builder can see how the Northstar Brand System is reviewed and shipped", async ({
  page,
}) => {
  await page.goto("/");

  const delivery = page.getByRole("region", {
    name: "Direct, review, and ship Northstar",
  });

  await expect(
    delivery.getByRole("heading", { name: "Revise with intent" }),
  ).toBeVisible();
  const selectedRegion = delivery.getByLabel("Selected Brand Region");
  await expect(selectedRegion).toBeChecked();
  await expect(delivery.getByText("Make the signal feel warmer")).toBeVisible();
  await selectedRegion.focus();
  await page.keyboard.press("ArrowRight");
  await expect(delivery.getByLabel("Complete Brand System")).toBeChecked();
  await expect(
    delivery.getByText("Northstar · Complete Brand System"),
  ).toBeVisible();
  await expect(
    delivery.getByText(
      "Make every touchpoint feel more exploratory while keeping Northstar calm.",
    ),
  ).toBeVisible();
  await expect(delivery.getByText("Northstar · Logo selected")).toBeHidden();

  await expect(
    delivery.getByRole("heading", { name: "Review without editing" }),
  ).toBeVisible();
  await expect(delivery.getByText("Review Link · Read only")).toBeVisible();
  await expect(delivery.getByText("Invitation")).toHaveCount(0);
  await expect(delivery.getByText("Public page")).toHaveCount(0);

  await expect(
    delivery.getByRole("heading", { name: "Export reusable Brand Artifacts" }),
  ).toBeVisible();
  for (const artifact of [
    "northstar-wordmark.svg",
    "northstar-symbol.svg",
    "Ink · #24334B",
    "Signal · #EE7C58",
    "Display · Instrument Serif",
    "Interface · Inter",
  ]) {
    await expect(delivery.getByText(artifact, { exact: true })).toBeVisible();
  }

  const tokens = delivery.getByRole("region", {
    name: "Northstar Design Tokens",
  });
  await expect(tokens.getByLabel("CSS output")).toContainText(
    "--color-signal: #ee7c58",
  );
  await expect(tokens.getByLabel("JSON output")).toContainText(
    '"color.signal": "#ee7c58"',
  );
  await expect(tokens.getByLabel("CSS output")).toHaveCSS(
    "font-family",
    /Geist Mono/,
  );
});

test("the final landing page action opens the public Brand Brief", async ({
  page,
}) => {
  await page.goto("/");

  const finalAction = page
    .getByRole("region", { name: "Start your Brand System" })
    .getByRole("link", { name: "Start your Brand Brief" });

  await expectActionOpensPublicBrandBrief(page, finalAction);
});

test("stable delivery surfaces have focused visual coverage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const delivery = page.getByRole("region", {
    name: "Direct, review, and ship Northstar",
  });
  await expect(delivery).toHaveScreenshot("delivery-surfaces.png", {
    animations: "disabled",
    mask: [
      delivery.locator(".revision-message"),
      delivery.locator(".revision-result"),
      delivery.locator(".revision-system-message"),
      delivery.locator(".revision-system-result"),
      delivery.locator(".review-canvas"),
      delivery.locator(".export-panel"),
      delivery.locator(".token-outputs"),
    ],
  });
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
