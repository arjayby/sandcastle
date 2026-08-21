import { expect, test } from "@playwright/test";

const DESCRIPTION_GUIDANCE =
  "Tell us what your company does, who it serves, and what makes it different. You can also include the feeling you want, preferred colors, visual references, competitors, and anything the brand should avoid.";

test("a Brand Builder can open and submit a Brand Brief with the keyboard", async ({
  page,
}) => {
  const companyName = "Northstar Studio";
  const description = "A planning tool for independent product teams.";

  await page.goto("/new");

  await expect(page).toHaveURL(/\/new$/);
  await expect(page.getByRole("main", { name: "Brand Canvas" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sandcastle home" }),
  ).toBeVisible();
  await expect(page.getByLabel("Company name")).toBeVisible();
  await expect(page.getByLabel("Description")).toHaveAttribute(
    "placeholder",
    DESCRIPTION_GUIDANCE,
  );

  await page.getByLabel("Company name").focus();
  await page.keyboard.type(companyName);
  await page.keyboard.press("Tab");
  await page.keyboard.type(description);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/new$/);
  expect(page.url()).not.toContain(encodeURIComponent(companyName));
  expect(page.url()).not.toContain(encodeURIComponent(description));
  await expect(
    page.getByText(
      "Your Brand Brief is ready and will be saved after sign up.",
    ),
  ).toBeVisible();

  const savedDraft = await page.evaluate(() =>
    sessionStorage.getItem("sandcastle.brand-brief-draft.v1"),
  );
  expect(savedDraft).not.toBeNull();
  expect(JSON.parse(savedDraft ?? "null")).toMatchObject({
    companyName,
    description,
  });
});

test("the public Brand Brief fits a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/new");

  for (const control of [
    page.getByLabel("Company name"),
    page.getByLabel("Description"),
    page.getByRole("button", { name: "Generate" }),
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
    }
  }
});
