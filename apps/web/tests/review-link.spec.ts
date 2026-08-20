import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { api } from "@sandcastle/backend/convex/_generated/api.js";
import type { Id } from "@sandcastle/backend/convex/_generated/dataModel.js";
import { ConvexHttpClient } from "convex/browser";
import { loadEnv } from "vite";

const convexUrl = loadEnv(
  "development",
  resolve(import.meta.dirname, ".."),
  "VITE_CONVEX_URL",
).VITE_CONVEX_URL;

test("a Brand Builder can share and revoke an accountless read only Review Link", async ({
  page,
  browser,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const companyName = `Reviewable ${runId}`;
  const description = "A launch planning tool for small creative teams.";

  await page.goto("/");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill("Review Owner");
  await page.getByLabel("Email").fill(`owner-${runId}@example.com`);
  await page.getByLabel("Password").fill("sandcastle-test-password");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);
  await expect(
    page
      .getByRole("region", { name: "Design Tokens Brand Region" })
      .getByText("Ready"),
  ).toBeVisible({ timeout: 30_000 });
  const projectId = page.url().split("/").at(-1) as Id<"brandProjects">;

  await page.getByRole("button", { name: "Share Review Link" }).click();
  await expect(
    page.getByRole("heading", { name: "Create a Review Link" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create Review Link" }).click();
  const reviewLinkInput = page.getByRole("textbox", { name: "Review Link" });
  await expect(reviewLinkInput).toHaveValue(/\/review\/[a-f0-9-]{36}$/);
  const reviewUrl = await reviewLinkInput.inputValue();

  const reviewerContext = await browser.newContext({
    hasTouch: true,
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
    reviewerPage.getByRole("application", { name: "Brand Canvas viewport" }),
  ).toBeVisible();
  await expect(
    reviewerPage.getByRole("link", { name: "All Brand Projects" }),
  ).toHaveCount(0);
  await expect(
    reviewerPage.getByRole("button", { name: "Share Review Link" }),
  ).toHaveCount(0);
  await expect(
    reviewerPage.getByRole("button", { name: "Sign out" }),
  ).toHaveCount(0);
  await expect(
    reviewerPage.getByRole("button", {
      name: /rename|duplicate|delete|retry/i,
    }),
  ).toHaveCount(0);
  await expect(
    reviewerPage.getByRole("button", {
      name: "Revise complete Brand System",
    }),
  ).toHaveCount(0);

  const zoomBefore = await reviewerPage.getByLabel("Canvas zoom").textContent();
  await reviewerPage.getByRole("button", { name: "Zoom in" }).click();
  await expect(reviewerPage.getByLabel("Canvas zoom")).not.toHaveText(
    zoomBefore ?? "",
  );
  const logo = reviewerPage.getByRole("region", {
    name: "Logo Brand Region",
  });
  await logo.getByRole("button", { name: "Inspect Logo Brand Region" }).click();
  const inspector = reviewerPage.getByRole("complementary", {
    name: "Brand Region inspector",
  });
  const reviewViewportBox = await reviewerPage
    .getByRole("application", { name: "Brand Canvas viewport" })
    .boundingBox();
  const reviewInspectorBox = await inspector.boundingBox();
  expect(reviewViewportBox).not.toBeNull();
  expect(reviewInspectorBox).not.toBeNull();
  if (reviewViewportBox && reviewInspectorBox) {
    expect(reviewInspectorBox.width).toBeGreaterThan(
      reviewViewportBox.width * 0.9,
    );
    expect(reviewInspectorBox.y).toBeGreaterThan(
      reviewViewportBox.y + reviewViewportBox.height * 0.35,
    );
  }
  await inspector.getByRole("button", { name: "Focus Logo" }).click();
  await inspector.getByRole("button", { name: "Copy logo tagline" }).click();
  await expect
    .poll(() => reviewerPage.evaluate(() => navigator.clipboard.readText()))
    .not.toBe("");
  const [download] = await Promise.all([
    reviewerPage.waitForEvent("download"),
    inspector
      .getByRole("button", { name: "Download Primary lockup logo" })
      .click(),
  ]);
  expect(download.suggestedFilename()).toContain("primary-lockup.svg");

  const unauthenticatedClient = new ConvexHttpClient(convexUrl);
  const blockedMutations = [
    unauthenticatedClient.mutation(api.brandProjects.updateBrief, {
      projectId,
      companyName: "Changed by reviewer",
      description,
    }),
    unauthenticatedClient.mutation(api.brandProjects.rename, {
      projectId,
      name: "Changed by reviewer",
    }),
    unauthenticatedClient.mutation(api.brandProjects.duplicate, { projectId }),
    unauthenticatedClient.mutation(api.brandProjects.remove, { projectId }),
    unauthenticatedClient.mutation(api.brandProjects.createReviewLink, {
      projectId,
    }),
  ];
  for (const mutation of blockedMutations) {
    await expect(mutation).rejects.toThrow();
  }

  await page.getByRole("button", { name: "Revoke Review Link" }).click();
  await page.getByRole("button", { name: "Confirm revocation" }).click();
  await expect(page.getByText("Review Link revoked")).toBeVisible();

  await reviewerPage.reload();
  await expect(
    reviewerPage.getByRole("heading", { name: "Review Link unavailable" }),
  ).toBeVisible();
  await expect(reviewerPage.getByText(companyName)).toHaveCount(0);
  await expect(reviewerPage.getByText(description)).toHaveCount(0);

  await reviewerPage.goto(`/review/${crypto.randomUUID()}`);
  await expect(
    reviewerPage.getByRole("heading", { name: "Review Link unavailable" }),
  ).toBeVisible();
  await expect(reviewerPage.getByText(companyName)).toHaveCount(0);

  await reviewerContext.close();
});
