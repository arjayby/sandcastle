import { expect, test } from "@playwright/test";

test("the complete MVP flow stays accessible and persistent across viewport sizes", async ({
  page,
  context,
  browser,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const companyName = `Complete ${runId}`;
  const description = "A planning tool for independent product teams.";

  await page.goto("/");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill("Complete Flow Owner");
  await page.getByLabel("Email").fill(`complete-${runId}@example.com`);
  await page.getByLabel("Password").fill("sandcastle-test-password");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);
  await expect(
    page.getByRole("status", { name: "Logo generation state: Generating" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Design Tokens Brand Region" })
      .getByText("Ready for production"),
  ).toBeVisible({ timeout: 30_000 });

  for (const viewportSize of [
    { width: 1440, height: 900 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewportSize);
    await expect(
      page.getByRole("application", { name: "Brand Canvas viewport" }),
    ).toBeVisible();
    for (const controlName of [
      "All Brand Projects",
      "Revise complete Brand System",
      "Share Review Link",
      "Fit Brand System",
      "Sign out",
    ]) {
      const box = await page
        .getByLabel(controlName, { exact: true })
        .boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewportSize.width);
      }
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  const color = page.getByRole("region", { name: "Color Brand Region" });
  await color
    .getByRole("button", { name: "Inspect Color Brand Region" })
    .click();
  const inspector = page.getByRole("complementary", {
    name: "Brand Region inspector",
  });
  await inspector
    .getByRole("button", { name: "Copy Signal Gold color value" })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("#EDB33F");
  await inspector
    .getByLabel("Revision request for Color")
    .fill("Shift the primary color toward a confident ocean blue.");
  await inspector.getByRole("button", { name: "Apply Color revision" }).click();
  await expect(color.getByText("#3F6FED", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await inspector.getByRole("button", { name: "Close inspector" }).click();

  const undo = page.getByRole("button", { name: "Undo Revision" });
  const redo = page.getByRole("button", { name: "Redo Revision" });
  await undo.click();
  await expect(color.getByText("#EDB33F", { exact: true })).toBeVisible();
  await redo.click();
  await expect(color.getByText("#3F6FED", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Share Review Link" }).click();
  await page.getByRole("button", { name: "Create Review Link" }).click();
  const reviewLink = page.getByRole("textbox", { name: "Review Link" });
  await expect(reviewLink).toHaveValue(/\/review\/[a-f0-9-]{36}$/);
  const reviewUrl = await reviewLink.inputValue();
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(
    page.getByRole("heading", { name: `${companyName} Brand System` }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Color Brand Region" })
      .getByText("#3F6FED", { exact: true }),
  ).toBeVisible();

  const reviewerContext = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    viewport: { width: 390, height: 844 },
  });
  const reviewerPage = await reviewerContext.newPage();
  await reviewerPage.goto(reviewUrl);
  await expect(
    reviewerPage.getByRole("heading", {
      name: `${companyName} Brand System`,
    }),
  ).toBeVisible();
  await expect(reviewerPage.getByText(description)).toContainText(description);
  await expect(
    reviewerPage.getByRole("button", {
      name: "Revise complete Brand System",
    }),
  ).toHaveCount(0);
  await expect(
    reviewerPage.getByRole("button", { name: "Share Review Link" }),
  ).toHaveCount(0);
  await reviewerContext.close();
});
