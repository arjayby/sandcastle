import { expect, type Page } from "@playwright/test";

export async function createReadyBrandProject(
  page: Page,
  {
    companyName,
    description,
    ownerName,
    ownerEmail,
  }: {
    companyName: string;
    description: string;
    ownerName: string;
    ownerEmail: string;
  },
) {
  await page.goto("/");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill(ownerName);
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill("sandcastle-test-password");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);
  await expect(
    page
      .getByRole("region", { name: "Design Tokens Brand Region" })
      .getByText("Ready for production"),
  ).toBeVisible({ timeout: 30_000 });
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account controls" }).click();
  await page.getByRole("menuitem", { name: "Sign Out" }).click();
}
