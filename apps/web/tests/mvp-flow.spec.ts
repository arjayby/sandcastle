import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test";

import { createReadyBrandProject } from "./helpers/brand-project";

const viewportCases = [
  { name: "desktop", size: { width: 1440, height: 900 } },
  { name: "tablet", size: { width: 820, height: 1180 } },
  { name: "phone", size: { width: 390, height: 844 } },
] as const;

async function runCompleteMvpFlow({
  browser,
  context,
  page,
  viewportName,
  viewportSize,
}: {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  viewportName: string;
  viewportSize: { width: number; height: number };
}) {
  await page.setViewportSize(viewportSize);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const companyName = `Complete ${viewportName} ${runId}`;
  const description = "A planning tool for independent product teams.";

  await createReadyBrandProject(page, {
    companyName,
    description,
    ownerName: "Complete Flow Owner",
    ownerEmail: `complete-${viewportName}-${runId}@example.com`,
  });

  const viewport = page.getByRole("application", {
    name: "Brand Canvas viewport",
  });
  await expect(viewport).toBeVisible();
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
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewportSize.height);
    }
  }

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
  await expect(
    page.getByRole("status", { name: "Color revision state: Revising" }),
  ).toBeVisible();
  await expect(color.getByText("#3F6FED", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    inspector.getByText(
      "Contrast warning: #3F6FED with #17231F has a 3.63:1 ratio, below 4.5:1 for common text.",
    ),
  ).toBeVisible();
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
    viewport: viewportSize,
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
}

for (const viewportCase of viewportCases) {
  test(`the complete MVP flow passes at ${viewportCase.name} size`, async ({
    browser,
    context,
    page,
  }) => {
    await runCompleteMvpFlow({
      browser,
      context,
      page,
      viewportName: viewportCase.name,
      viewportSize: viewportCase.size,
    });
  });
}
