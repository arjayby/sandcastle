import { expect, test } from "@playwright/test";

test("a Brand Builder can apply regional and complete Semantic Revisions coherently", async ({
  page,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const companyName = `Revision ${runId}`;

  await page.goto("/");
  await page.getByLabel("Company name").fill(companyName);
  await page
    .getByLabel("Description")
    .fill("A planning tool for independent product teams.");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill("Revision Owner");
  await page.getByLabel("Email").fill(`revision-${runId}@example.com`);
  await page.getByLabel("Password").fill("sandcastle-test-password");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);

  const reviseSystem = page.getByRole("button", {
    name: "Revise complete Brand System",
  });
  await expect(reviseSystem).toBeDisabled();

  const color = page.getByRole("region", { name: "Color Brand Region" });
  const interfaceFoundation = page.getByRole("region", {
    name: "Interface Foundation Brand Region",
  });
  const designTokens = page.getByRole("region", {
    name: "Design Tokens Brand Region",
  });
  const photography = page.getByRole("region", {
    name: "Photography Brand Region",
  });
  await expect(designTokens.getByText("Ready for production")).toBeVisible({
    timeout: 30_000,
  });
  await expect(reviseSystem).toBeEnabled();
  const undo = page.getByRole("button", { name: "Undo Revision" });
  const redo = page.getByRole("button", { name: "Redo Revision" });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  const photographUrlsBefore = await photography
    .getByRole("img")
    .evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  expect(photographUrlsBefore).toHaveLength(4);

  await color
    .getByRole("button", { name: "Inspect Color Brand Region" })
    .click();
  const regionInspector = page.getByRole("complementary", {
    name: "Brand Region inspector",
  });
  await expect(
    regionInspector.getByRole("heading", { name: "Color" }),
  ).toBeVisible();
  await expect(
    regionInspector.getByText("Use Signal Gold for the primary action."),
  ).toBeVisible();
  await regionInspector
    .getByLabel("Revision request for Color")
    .fill(
      "Shift the primary color toward a confident ocean blue, but do not replace the existing photographs.",
    );
  await regionInspector
    .getByRole("button", { name: "Apply Color revision" })
    .click();

  await Promise.all([
    ...[color, interfaceFoundation, designTokens].map((affectedRegion) =>
      expect(
        affectedRegion.getByText("Revising", { exact: true }),
      ).toBeVisible(),
    ),
    expect(reviseSystem).toBeDisabled(),
  ]);
  await expect(
    regionInspector.getByRole("button", { name: "Apply Color revision" }),
  ).toBeDisabled();
  await expect(color.getByText("#3F6FED", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    interfaceFoundation.getByText("Move with a clearer horizon."),
  ).toBeVisible();
  await expect(designTokens.getByLabel("CSS design tokens")).toContainText(
    "--color-primary: #3F6FED",
  );
  expect(
    await photography
      .getByRole("img")
      .evaluateAll((images) =>
        images.map((image) => image.getAttribute("src")),
      ),
  ).toEqual(photographUrlsBefore);

  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
  await undo.click();
  await expect(color.getByText("#EDB33F", { exact: true })).toBeVisible();
  await expect(designTokens.getByLabel("CSS design tokens")).toContainText(
    "--color-primary: #EDB33F",
  );
  await expect(
    interfaceFoundation.getByText("Find the clearest way forward."),
  ).toBeVisible();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();

  await page.reload();
  await expect(redo).toBeEnabled();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Already have an account? Sign in" })
    .click();
  await page.getByLabel("Email").fill(`revision-${runId}@example.com`);
  await page.getByLabel("Password").fill("sandcastle-test-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(
    page.getByRole("heading", { name: `${companyName} Brand System` }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(color.getByText("#3F6FED", { exact: true })).toBeVisible();
  await expect(designTokens.getByLabel("CSS design tokens")).toContainText(
    "--color-primary: #3F6FED",
  );
  await expect(
    interfaceFoundation.getByText("Move with a clearer horizon."),
  ).toBeVisible();
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();

  await reviseSystem.click();
  const systemInspector = page.getByRole("complementary", {
    name: "Brand System revision inspector",
  });
  await systemInspector
    .getByLabel("Revision request for complete Brand System")
    .fill("Make the complete system feel bolder and more decisive.");
  await systemInspector
    .getByRole("button", { name: "Apply complete Brand System revision" })
    .click();

  const completeSystemRegions = [
    "Logo",
    "Color",
    "Typography",
    "Voice and Tone",
    "Photography",
    "Motion",
    "Interface Foundation",
    "Design Tokens",
  ];
  await Promise.all(
    completeSystemRegions.map((regionName) =>
      expect(
        page
          .getByRole("region", { name: `${regionName} Brand Region` })
          .getByText("Revising", { exact: true }),
      ).toBeVisible(),
    ),
  );
  await expect(
    page.getByText("Build a bolder shared signal.", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page
      .getByRole("region", { name: "Typography Brand Region" })
      .getByText("Make the next move unmistakable.", { exact: true }),
  ).toBeVisible();
  expect(
    await photography
      .getByRole("img")
      .evaluateAll((images) =>
        images.map((image) => image.getAttribute("src")),
      ),
  ).toEqual(photographUrlsBefore);
});
