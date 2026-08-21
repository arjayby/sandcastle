import { expect, test } from "@playwright/test";

import { createReadyBrandProject } from "./helpers/brand-project";

async function openAccessibleBrandProject(
  page: import("@playwright/test").Page,
) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await createReadyBrandProject(page, {
    companyName: `Accessible ${runId}`,
    description: "A planning tool for independent product teams.",
    ownerName: "Accessible Owner",
    ownerEmail: `accessible-${runId}@example.com`,
  });
}

test("keyboard focus enters and leaves a Brand Region inspector logically", async ({
  page,
}) => {
  await openAccessibleBrandProject(page);

  const inspectColor = page.getByRole("button", {
    name: "Inspect Color Brand Region",
  });
  await inspectColor.focus();
  await page.keyboard.press("Enter");

  const inspector = page.getByRole("complementary", {
    name: "Brand Region inspector",
  });
  const closeInspector = inspector.getByRole("button", {
    name: "Close inspector",
  });
  await expect(closeInspector).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(inspectColor).toBeFocused();

  const reviseSystem = page.getByRole("button", {
    name: "Revise complete Brand System",
  });
  await reviseSystem.focus();
  await page.keyboard.press("Enter");
  const closeSystemInspector = page
    .getByRole("complementary", { name: "Brand System revision inspector" })
    .getByRole("button", { name: "Close system revision inspector" });
  await expect(closeSystemInspector).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(reviseSystem).toBeFocused();
});

test("editor chrome, generation state, contrast guidance, and motion preferences are clear", async ({
  page,
}) => {
  await openAccessibleBrandProject(page);

  const toolbar = page.getByRole("toolbar", {
    name: "Brand Canvas controls",
  });
  await expect(toolbar).toHaveCSS("background-color", "rgb(255, 253, 248)");
  await expect(toolbar).toHaveCSS("color", "rgb(32, 32, 30)");
  await expect(
    toolbar.getByRole("link", { name: "All Brand Projects" }),
  ).toHaveCSS("border-color", "rgb(217, 206, 184)");

  await expect(
    page.getByRole("status", { name: "Color generation state: Ready" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Inspect Color Brand Region" })
    .click();
  await expect(
    page.getByText(/Contrast warning: #D57658 with #FFFFFF has a .* ratio/),
  ).toBeVisible();

  const viewport = page.getByRole("application", {
    name: "Brand Canvas viewport",
  });
  await page.getByRole("button", { name: "Fit Brand System" }).focus();
  await page.keyboard.press("Tab");
  await expect(viewport).toBeFocused();
  await expect(viewport).toHaveCSS("outline-style", "solid");
  await expect(viewport).toHaveCSS("outline-width", "3px");
  await expect(viewport).toHaveCSS("background-repeat", "no-repeat");
  await expect(viewport).toHaveCSS("background-size", "cover");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".brand-motion-orbit")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".brand-interface-control").first()).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
