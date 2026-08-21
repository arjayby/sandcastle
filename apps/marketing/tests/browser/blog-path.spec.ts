import { expect, test } from "@playwright/test";

test("a reader opens a real MDX article from the blog index", async ({
  page,
}) => {
  await page.goto("/blog/");
  await page
    .getByRole("link", { name: "Build a Brand System that stays coherent" })
    .click();

  await expect(page).toHaveURL(/\/blog\/build-a-brand-system\/$/);
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
    await example.focus();
    await expect(example).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Compare one message across your website"),
    ).toBeVisible();
  }
});
