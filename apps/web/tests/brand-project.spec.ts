import { expect, test } from "@playwright/test";

const DESCRIPTION_GUIDANCE =
  "Tell us what your company does, who it serves, and what makes it different. You can also include the feeling you want, preferred colors, visual references, competitors, and anything the brand should avoid.";

const REGION_NAMES = [
  "Logo",
  "Color",
  "Typography",
  "Voice and Tone",
  "Photography",
  "Motion",
  "Interface Foundation",
  "Design Tokens",
] as const;

test("a Brand Builder can create, authenticate, reopen, and persist an owned Brand Project", async ({
  page,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerEmail = `owner-${runId}@example.com`;
  const otherOwnerEmail = `other-${runId}@example.com`;
  const password = "sandcastle-test-password";
  const companyName = `Northstar ${runId}`;
  const description = "A planning tool for independent product teams.";

  await page.goto("/");

  await expect(page.getByRole("main", { name: "Brand Canvas" })).toBeVisible();
  await expect(page.getByLabel("Company name")).toBeVisible();
  await expect(page.getByLabel("Description")).toHaveAttribute(
    "placeholder",
    DESCRIPTION_GUIDANCE,
  );

  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your Brand Brief is ready and will be saved after sign up.",
    ),
  ).toBeVisible();
  await page.getByLabel("Name").fill("First Owner");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);
  const projectUrl = page.url();
  await expect(page.getByRole("main", { name: "Brand Canvas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: companyName })).toBeVisible();
  await expect(page.getByText(description)).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("heading", { name: `${companyName} Brand System` }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Brand System board" }),
  ).toBeVisible();

  for (const regionName of REGION_NAMES) {
    await expect(
      page.getByRole("button", { name: `${regionName} Brand Region` }),
    ).toBeVisible();
  }

  const viewport = page.getByRole("application", {
    name: "Brand Canvas viewport",
  });
  const logo = page.getByRole("button", { name: "Logo Brand Region" });
  const color = page.getByRole("button", { name: "Color Brand Region" });
  const initialLogoBox = await logo.boundingBox();
  const initialColorBox = await color.boundingBox();
  const viewportBox = await viewport.boundingBox();
  expect(initialLogoBox).not.toBeNull();
  expect(initialColorBox).not.toBeNull();
  expect(viewportBox).not.toBeNull();
  if (!(initialLogoBox && initialColorBox && viewportBox)) {
    return;
  }

  await page.mouse.move(viewportBox.x + 500, viewportBox.y + 520);
  await page.mouse.wheel(80, 60);
  await expect
    .poll(async () => {
      const currentLogoBox = await logo.boundingBox();
      return currentLogoBox ? Math.abs(currentLogoBox.x - initialLogoBox.x) : 0;
    })
    .toBeGreaterThan(20);
  const trackpadLogoBox = await logo.boundingBox();
  const trackpadColorBox = await color.boundingBox();
  expect(trackpadLogoBox).not.toBeNull();
  expect(trackpadColorBox).not.toBeNull();
  if (!(trackpadLogoBox && trackpadColorBox)) {
    return;
  }
  expect(Math.abs(trackpadLogoBox.x - initialLogoBox.x)).toBeGreaterThan(20);
  expect(trackpadLogoBox.x - initialLogoBox.x).toBeCloseTo(
    trackpadColorBox.x - initialColorBox.x,
    0,
  );
  expect(trackpadLogoBox.y - initialLogoBox.y).toBeCloseTo(
    trackpadColorBox.y - initialColorBox.y,
    0,
  );
  expect(trackpadLogoBox.width).toBeCloseTo(initialLogoBox.width, 0);

  await page.getByRole("button", { name: "Fit Brand System" }).click();
  await page.mouse.move(viewportBox.x + 500, viewportBox.y + 520);
  await page.mouse.down();
  await page.mouse.move(viewportBox.x + 620, viewportBox.y + 580, {
    steps: 5,
  });
  await page.mouse.up();

  const pannedLogoBox = await logo.boundingBox();
  const pannedColorBox = await color.boundingBox();
  expect(pannedLogoBox).not.toBeNull();
  expect(pannedColorBox).not.toBeNull();
  expect(pannedLogoBox?.x).toBeGreaterThan(initialLogoBox.x + 90);
  expect(pannedLogoBox?.y).toBeGreaterThan(initialLogoBox.y + 40);
  if (pannedLogoBox && pannedColorBox) {
    expect(pannedLogoBox.x - initialLogoBox.x).toBeCloseTo(
      pannedColorBox.x - initialColorBox.x,
      0,
    );
    expect(pannedLogoBox.y - initialLogoBox.y).toBeCloseTo(
      pannedColorBox.y - initialColorBox.y,
      0,
    );
  }

  await page.getByRole("button", { name: "Fit Brand System" }).click();
  const fittedLogoBox = await logo.boundingBox();
  expect(fittedLogoBox?.x).toBeCloseTo(initialLogoBox.x, 0);
  expect(fittedLogoBox?.y).toBeCloseTo(initialLogoBox.y, 0);

  const zoomBefore = await page.getByLabel("Canvas zoom").textContent();
  if (!fittedLogoBox) {
    return;
  }
  const zoomAnchor = {
    x: fittedLogoBox.x + fittedLogoBox.width / 2,
    y: fittedLogoBox.y + fittedLogoBox.height / 2,
  };
  await page.mouse.move(zoomAnchor.x, zoomAnchor.y);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -240);
  await page.keyboard.up("Control");

  await expect(page.getByLabel("Canvas zoom")).not.toHaveText(zoomBefore ?? "");
  const zoomedLogoBox = await logo.boundingBox();
  expect(zoomedLogoBox?.width).toBeGreaterThan(fittedLogoBox.width);
  if (zoomedLogoBox) {
    expect(
      Math.abs(zoomedLogoBox.x + zoomedLogoBox.width / 2 - zoomAnchor.x),
    ).toBeLessThan(2);
    expect(
      Math.abs(zoomedLogoBox.y + zoomedLogoBox.height / 2 - zoomAnchor.y),
    ).toBeLessThan(2);
  }

  await page.getByRole("button", { name: "Fit Brand System" }).click();
  await page.getByRole("button", { name: "Color Brand Region" }).click();
  const inspector = page.getByRole("complementary", {
    name: "Brand Region inspector",
  });
  await expect(inspector.getByRole("heading", { name: "Color" })).toBeVisible();
  await expect(
    inspector.getByText("Saffron leads every primary action."),
  ).toBeVisible();

  const colorBeforeFocus = await color.boundingBox();
  await inspector.getByRole("button", { name: "Focus Color" }).click();
  const colorAfterFocus = await color.boundingBox();
  const inspectorBox = await inspector.boundingBox();
  expect(colorBeforeFocus).not.toBeNull();
  expect(colorAfterFocus).not.toBeNull();
  expect(inspectorBox).not.toBeNull();
  expect(colorAfterFocus?.width).toBeGreaterThan(colorBeforeFocus?.width ?? 0);
  if (colorAfterFocus && inspectorBox) {
    expect(colorAfterFocus.x + colorAfterFocus.width / 2).toBeCloseTo(
      viewportBox.x + (inspectorBox.x - viewportBox.x - 24) / 2,
      -1,
    );
    expect(colorAfterFocus.y + colorAfterFocus.height / 2).toBeCloseTo(
      viewportBox.y + viewportBox.height / 2,
      -1,
    );
    expect(colorAfterFocus.x + colorAfterFocus.width).toBeLessThan(
      inspectorBox.x,
    );
  }

  await page.getByRole("button", { name: "Fit Brand System" }).click();
  const interfaceFoundation = page.getByRole("button", {
    name: "Interface Foundation Brand Region",
  });
  await interfaceFoundation.click();
  await expect(
    inspector.getByRole("heading", { name: "Interface Foundation" }),
  ).toBeVisible();
  const interfaceBeforeFocus = await interfaceFoundation.boundingBox();
  await inspector
    .getByRole("button", { name: "Focus Interface Foundation" })
    .click();
  const interfaceAfterFocus = await interfaceFoundation.boundingBox();
  const focusedInspectorBox = await inspector.boundingBox();
  expect(interfaceAfterFocus?.width).toBeGreaterThan(
    interfaceBeforeFocus?.width ?? 0,
  );
  if (interfaceAfterFocus && focusedInspectorBox) {
    expect(interfaceAfterFocus.x + interfaceAfterFocus.width).toBeLessThan(
      focusedInspectorBox.x,
    );
  }

  await page.setViewportSize({ width: 375, height: 800 });
  await page.getByRole("button", { name: "Fit Brand System" }).click();
  const narrowViewportBox = await viewport.boundingBox();
  const fittedBoardBox = await page
    .getByRole("region", { name: "Brand System board" })
    .boundingBox();
  expect(narrowViewportBox).not.toBeNull();
  expect(fittedBoardBox).not.toBeNull();
  if (narrowViewportBox && fittedBoardBox) {
    expect(fittedBoardBox.x).toBeGreaterThanOrEqual(narrowViewportBox.x + 45);
    expect(fittedBoardBox.x + fittedBoardBox.width).toBeLessThanOrEqual(
      narrowViewportBox.x + narrowViewportBox.width - 45,
    );
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  await expect(
    page.getByRole("button", { name: /add object|layers|resize/i }),
  ).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: companyName })).toBeVisible();
  await expect(page.getByText(description)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(
    page.getByText("Create an account to continue to your Brand Projects."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Already have an account? Sign in" })
    .click();
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: companyName })).toHaveCount(1);
  await page.getByRole("link", { name: companyName }).click();
  await expect(page).toHaveURL(projectUrl);
  await expect(page.getByText(description)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Need an account? Sign up" }).click();
  await page.getByLabel("Name").fill("Other Owner");
  await page.getByLabel("Email").fill(otherOwnerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(
    page.getByRole("heading", { name: "Brand Project not found" }),
  ).toBeVisible();
  await expect(page.getByText(description)).not.toBeVisible();
});

test("a Brand Builder can manage multiple Brand Projects", async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `portfolio-${runId}@example.com`;
  const password = "sandcastle-test-password";
  const firstName = `Atlas ${runId}`;
  const firstDescription = "An operations platform for independent studios.";
  const secondName = `Beacon ${runId}`;
  const secondDescription = "A customer research tool for early product teams.";

  await page.goto("/");
  await page.getByLabel("Company name").fill(firstName);
  await page.getByLabel("Description").fill(firstDescription);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill("Portfolio Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);

  await page.getByRole("link", { name: "All Brand Projects" }).click();
  await page.getByRole("link", { name: "Create Brand Project" }).click();
  await page.getByLabel("Company name").fill(secondName);
  await page.getByLabel("Description").fill(secondDescription);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);

  await page.getByRole("link", { name: "All Brand Projects" }).click();
  await expect(page.getByRole("link", { name: firstName })).toBeVisible();
  await expect(page.getByText(firstDescription)).toBeVisible();
  await expect(page.getByRole("link", { name: secondName })).toBeVisible();
  await expect(page.getByText(secondDescription)).toBeVisible();
  await expect(page.getByText("Brand preview pending")).toHaveCount(2);

  await page.getByRole("link", { name: secondName }).click();
  await expect(page.getByRole("heading", { name: secondName })).toBeVisible();
  await page.getByRole("link", { name: "All Brand Projects" }).click();

  await page
    .getByRole("button", { name: `Brand Project actions for ${firstName}` })
    .click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  const renamedProject = `${firstName} renamed`;
  await page.getByLabel("Brand Project name").fill(renamedProject);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("link", { name: renamedProject })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: renamedProject })).toBeVisible();

  await page
    .getByRole("button", {
      name: `Brand Project actions for ${renamedProject}`,
    })
    .click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  const copiedProject = `${renamedProject} copy`;
  await expect(page.getByRole("link", { name: copiedProject })).toBeVisible();
  await expect(page.getByText(firstDescription)).toHaveCount(2);
  await page.getByRole("link", { name: copiedProject }).click();
  await expect(
    page.getByRole("heading", { name: copiedProject }),
  ).toBeVisible();
  await expect(page.getByText(firstDescription)).toBeVisible();
  await page.getByRole("link", { name: "All Brand Projects" }).click();

  await page
    .getByRole("button", {
      name: `Brand Project actions for ${copiedProject}`,
    })
    .click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Brand Project name").fill("Independent copy");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("link", { name: renamedProject })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Independent copy" }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: `Brand Project actions for ${secondName}`,
    })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(
    page.getByRole("heading", { name: `Delete ${secondName}?` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete Brand Project" }).click();
  await expect(page.getByRole("link", { name: secondName })).toHaveCount(0);
  await expect(page.getByRole("link", { name: renamedProject })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Independent copy" }),
  ).toBeVisible();
});
