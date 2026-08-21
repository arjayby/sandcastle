import { expect, test } from "@playwright/test";

import { createReadyBrandProject } from "./helpers/brand-project";
import { expectFullScreenInspector } from "./helpers/responsive";

async function openFocusedBrandProject(page: import("@playwright/test").Page) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const companyName = `Focused ${runId}`;

  await createReadyBrandProject(page, {
    companyName,
    description: "A planning tool for independent product teams.",
    ownerName: "Focused Owner",
    ownerEmail: `focused-${runId}@example.com`,
  });

  return companyName;
}

test("the focused product shell frames a stable generated Brand System", async ({
  page,
}) => {
  const companyName = await openFocusedBrandProject(page);

  const appHeader = page.getByRole("banner");
  await expect(
    appHeader.getByRole("link", { name: "Sandcastle home" }),
  ).toBeVisible();
  await expect(
    appHeader.getByRole("link", { name: "Brand Projects" }),
  ).toBeVisible();
  await expect(appHeader.getByText(companyName, { exact: true })).toBeVisible();
  await expect(
    appHeader.getByRole("button", { name: "Account controls" }),
  ).toBeVisible();
  await expect(
    appHeader.getByRole("button", { name: "Toggle theme" }),
  ).toBeVisible();

  const canvas = page.getByRole("main", { name: "Brand Canvas" });
  const toolbar = canvas.getByRole("toolbar", {
    name: "Brand Canvas controls",
  });
  await expect(
    toolbar.getByRole("button", { name: "Revise complete Brand System" }),
  ).toBeVisible();
  await expect(
    toolbar.getByRole("button", { name: "Share Review Link" }),
  ).toBeVisible();
  await expect(toolbar).toHaveCSS("font-family", /Inter/);
  await expect(toolbar).toHaveCSS("background-color", "rgb(255, 253, 248)");

  const colorRegion = page.getByRole("region", {
    name: "Color Brand Region",
  });
  const firstSwatch = colorRegion
    .locator("[style*='background-color']")
    .first();
  const colorRegionHeading = colorRegion.getByRole("heading", {
    name: "Color",
  });
  const typographySample = page
    .getByRole("region", { name: "Typography Brand Region" })
    .getByText("Find the clearest way forward.");
  const readBrandValues = () =>
    Promise.all([
      firstSwatch.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      colorRegionHeading.evaluate((element) => getComputedStyle(element).color),
      typographySample.evaluate(
        (element) => getComputedStyle(element).fontFamily,
      ),
    ]);
  const brandValuesBefore = await readBrandValues();

  await appHeader.getByRole("button", { name: "Toggle theme" }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();

  await expect(toolbar).toHaveCSS("background-color", "rgb(43, 43, 40)");
  await expect.poll(readBrandValues).toEqual(brandValuesBefore);
});

test("a phone uses a full screen Brand Region inspector", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const companyName = await openFocusedBrandProject(page);

  const appHeader = page.getByRole("banner");
  await expect(appHeader.getByText(companyName, { exact: true })).toBeVisible();
  const brandProjectsLink = appHeader.getByRole("link", {
    name: "Brand Projects",
  });
  await expect(brandProjectsLink).toBeVisible();
  const brandProjectsBox = await brandProjectsLink.boundingBox();
  expect(brandProjectsBox).not.toBeNull();
  expect(brandProjectsBox?.width).toBeGreaterThanOrEqual(44);
  expect(brandProjectsBox?.height).toBeGreaterThanOrEqual(44);

  const viewport = page.getByRole("application", {
    name: "Brand Canvas viewport",
  });
  await page
    .getByRole("button", { name: "Inspect Color Brand Region" })
    .click();
  const inspector = page.getByRole("complementary", {
    name: "Brand Region inspector",
  });
  await expectFullScreenInspector(inspector, viewport);
  await expect(
    inspector.getByRole("button", { name: "Apply Color revision" }),
  ).toBeVisible();
});
