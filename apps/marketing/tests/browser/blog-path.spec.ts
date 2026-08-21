import { expect, test } from "@playwright/test";

async function focusWithKeyboard(
  page: import("@playwright/test").Page,
  target: import("@playwright/test").Locator,
) {
  for (let tabPress = 0; tabPress < 12; tabPress += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      break;
    }
  }

  await expect(target).toBeFocused();
  await expect(target).toHaveCSS("outline-style", "solid");
  await expect(target).toHaveCSS("outline-width", "3px");
}

test("a Brand Builder moves from marketing content to a private Brand Brief", async ({
  page,
}) => {
  const companyName = "Northstar Studio";
  const description = "A planning tool for independent product teams.";

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const marketingOrigin = new URL(page.url()).origin;
  const journal = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Journal" });
  await focusWithKeyboard(page, journal);
  await page.keyboard.press("Enter");

  const articleLink = page.getByRole("link", {
    name: "Build a Brand System that stays coherent",
  });
  await focusWithKeyboard(page, articleLink);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/blog\/build-a-brand-system\/$/);
  await expect(page.getByRole("article")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Build a Brand System that stays coherent",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("A complete system gives every choice a job."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "All articles" }),
  ).toHaveAttribute("href", "/blog/");

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }

  const buildBrandSystemLink = page
    .getByRole("link", { name: "Build your Brand System", exact: true })
    .first();
  await expect(buildBrandSystemLink).toHaveCSS("transition-duration", "0s");
  await focusWithKeyboard(page, buildBrandSystemLink);

  const productUrl = new URL(
    (await buildBrandSystemLink.getAttribute("href")) ?? "",
  );
  expect(productUrl.origin).not.toBe(marketingOrigin);
  expect(productUrl.origin).toBe("http://localhost:5173");
  expect(productUrl.pathname).toBe("/new");
  expect(productUrl.search).toBe("");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL("http://localhost:5173/new");
  await expect(page.getByRole("main", { name: "Brand Canvas" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Start with your Brand Brief" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 320, height: 700 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByText("Brief. Build. Refine. Ship.")).toHaveCSS(
    "transition-duration",
    "0s",
  );

  await page.getByLabel("Company name").focus();
  await page.keyboard.type(companyName);
  await page.keyboard.press("Tab");
  await page.keyboard.type(description);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/projects\/new$/);
  expect(page.url()).not.toContain(encodeURIComponent(companyName));
  expect(page.url()).not.toContain(encodeURIComponent(description));
});

test("article content works at phone and desktop widths with a keyboard", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/blog/build-a-brand-system/");

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const example = page.getByText("Check system coherence");
    for (let tabPress = 0; tabPress < 10; tabPress += 1) {
      if (
        await example.evaluate((element) => element === document.activeElement)
      ) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(example).toBeFocused();
    await expect(example).toHaveCSS("outline-style", "solid");
    await expect(example).toHaveCSS("outline-width", "3px");
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Compare one message across your website"),
    ).toBeVisible();
  }
});
