import { expect, test } from "@playwright/test";

async function createReadyBrandProject(page: import("@playwright/test").Page) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await page.goto("/");
  await page.getByLabel("Company name").fill(`Accessible ${runId}`);
  await page
    .getByLabel("Description")
    .fill("A planning tool for independent product teams.");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill("Accessible Owner");
  await page.getByLabel("Email").fill(`accessible-${runId}@example.com`);
  await page.getByLabel("Password").fill("sandcastle-test-password");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);
  await expect(
    page
      .getByRole("region", { name: "Design Tokens Brand Region" })
      .getByText("Ready for production"),
  ).toBeVisible({ timeout: 30_000 });
}

test("keyboard focus enters and leaves a Brand Region inspector logically", async ({
  page,
}) => {
  await createReadyBrandProject(page);

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
  await createReadyBrandProject(page);

  const toolbar = page.getByRole("toolbar", {
    name: "Brand Canvas controls",
  });
  await expect(toolbar).toHaveCSS("background-color", "rgb(32, 32, 30)");
  await expect(toolbar).toHaveCSS("color", "rgb(247, 244, 237)");

  await expect(
    page.getByRole("status", { name: "Color generation state: Ready" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Inspect Color Brand Region" })
    .click();
  await expect(
    page.getByText(
      "Contrast warning: does not meet common text contrast thresholds.",
    ),
  ).toBeVisible();

  const viewport = page.getByRole("application", {
    name: "Brand Canvas viewport",
  });
  await page.getByRole("button", { name: "Sign out" }).focus();
  await page.keyboard.press("Tab");
  await expect(viewport).toBeFocused();
  await expect(viewport).toHaveCSS("outline-style", "solid");
  await expect(viewport).toHaveCSS("outline-width", "3px");
  await expect(viewport).toHaveCSS(
    "background-repeat",
    Array.from({ length: 7 }, () => "no-repeat").join(", "),
  );

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
