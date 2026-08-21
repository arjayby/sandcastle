import {
  type CDPSession,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";

import {
  expectBottomSheet,
  expectFullScreenInspector,
} from "./helpers/responsive";

type TouchPoint = {
  id: number;
  x: number;
  y: number;
};

async function dispatchTouch(
  session: CDPSession,
  type: "touchStart" | "touchMove" | "touchEnd",
  touchPoints: TouchPoint[],
) {
  await session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: touchPoints.map((point) => ({
      ...point,
      radiusX: 8,
      radiusY: 8,
      force: 1,
    })),
  });
}

async function dispatchTouchPointer(
  viewport: Locator,
  type: "pointerdown" | "pointermove" | "pointerup",
  point: TouchPoint,
  isPrimary: boolean,
) {
  await viewport.dispatchEvent(type, {
    pointerId: point.id,
    pointerType: "touch",
    isPrimary,
    button: type === "pointermove" ? -1 : 0,
    buttons: type === "pointerup" ? 0 : 1,
    clientX: point.x,
    clientY: point.y,
  });
}

async function openGeneratedBrandProject(page: Page) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await page.goto("/");
  await page.getByLabel("Company name").fill(`Revision ${runId}`);
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
  await expect(
    page
      .getByRole("region", { name: "Design Tokens Brand Region" })
      .getByText("Ready for production"),
  ).toBeVisible({ timeout: 30_000 });
}

test("touch controls preserve the Brand Canvas across phone, tablet, and desktop viewports", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    permissions: ["clipboard-read", "clipboard-write"],
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await openGeneratedBrandProject(page);

  const viewport = page.getByRole("application", {
    name: "Brand Canvas viewport",
  });
  const board = page.getByRole("region", { name: "Brand System board" });
  const color = page.getByRole("region", { name: "Color Brand Region" });

  await color
    .getByRole("button", { name: "Inspect Color Brand Region" })
    .click();
  const inspector = page.getByRole("complementary", {
    name: "Brand Region inspector",
  });
  const desktopViewportBox = await viewport.boundingBox();
  const desktopInspectorBox = await inspector.boundingBox();
  expect(desktopViewportBox).not.toBeNull();
  expect(desktopInspectorBox).not.toBeNull();
  if (!(desktopViewportBox && desktopInspectorBox)) {
    return;
  }
  expect(desktopInspectorBox.x).toBeGreaterThan(
    desktopViewportBox.x + desktopViewportBox.width / 2,
  );
  expect(desktopInspectorBox.height).toBeGreaterThan(
    desktopViewportBox.height * 0.9,
  );
  await inspector.getByRole("button", { name: "Close inspector" }).click();

  await page.setViewportSize({ width: 320, height: 700 });
  const smallScreenControls = [
    "All Brand Projects",
    "Revise complete Brand System",
    "Share Review Link",
    "Fit Brand System",
    "Account controls",
  ];
  for (const name of smallScreenControls) {
    const controlBox = await page
      .getByLabel(name, { exact: true })
      .boundingBox();
    expect(controlBox).not.toBeNull();
    if (controlBox) {
      expect(controlBox.x).toBeGreaterThanOrEqual(0);
      expect(controlBox.x + controlBox.width).toBeLessThanOrEqual(320);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const session = await context.newCDPSession(page);
  await page.getByRole("button", { name: "Fit Brand System" }).click();

  const phoneViewportBox = await viewport.boundingBox();
  const boardBeforePan = await board.boundingBox();
  const colorBeforePan = await color.boundingBox();
  expect(phoneViewportBox).not.toBeNull();
  expect(boardBeforePan).not.toBeNull();
  expect(colorBeforePan).not.toBeNull();
  if (!(phoneViewportBox && boardBeforePan && colorBeforePan)) {
    return;
  }

  const panStart = {
    id: 1,
    x: colorBeforePan.x + colorBeforePan.width / 2,
    y: colorBeforePan.y + colorBeforePan.height / 2,
  };
  await dispatchTouch(session, "touchStart", [panStart]);
  await dispatchTouch(session, "touchMove", [
    { ...panStart, x: panStart.x + 72, y: panStart.y + 48 },
  ]);
  await dispatchTouch(session, "touchEnd", []);

  const boardAfterPan = await board.boundingBox();
  expect(boardAfterPan).not.toBeNull();
  expect((boardAfterPan?.x ?? 0) - boardBeforePan.x).toBeGreaterThan(50);
  await expect(inspector).toHaveCount(0);

  await page.getByRole("button", { name: "Fit Brand System" }).click();
  const boardBeforePinch = await board.boundingBox();
  expect(boardBeforePinch).not.toBeNull();
  if (!boardBeforePinch) {
    return;
  }
  const gestureCenter = {
    x: phoneViewportBox.x + phoneViewportBox.width / 2,
    y: phoneViewportBox.y + phoneViewportBox.height / 2,
  };
  const firstPinchPoint = {
    id: 1,
    x: gestureCenter.x - 35,
    y: gestureCenter.y,
  };
  const secondPinchPoint = {
    id: 2,
    x: gestureCenter.x + 35,
    y: gestureCenter.y,
  };
  await dispatchTouchPointer(viewport, "pointerdown", firstPinchPoint, true);
  await dispatchTouchPointer(viewport, "pointerdown", secondPinchPoint, false);
  await dispatchTouchPointer(
    viewport,
    "pointermove",
    { id: 1, x: gestureCenter.x - 75, y: gestureCenter.y },
    true,
  );
  await dispatchTouchPointer(
    viewport,
    "pointermove",
    { id: 2, x: gestureCenter.x + 75, y: gestureCenter.y },
    false,
  );
  await dispatchTouchPointer(viewport, "pointerup", firstPinchPoint, true);
  await dispatchTouchPointer(viewport, "pointerup", secondPinchPoint, false);

  const boardAfterPinch = await board.boundingBox();
  expect(boardAfterPinch).not.toBeNull();
  expect(boardAfterPinch?.width).toBeGreaterThan(boardBeforePinch.width * 1.8);
  if (boardAfterPinch) {
    expect(
      Math.abs(
        boardAfterPinch.x +
          boardAfterPinch.width / 2 -
          (boardBeforePinch.x + boardBeforePinch.width / 2),
      ),
    ).toBeLessThan(3);
  }

  await color
    .getByRole("button", { name: "Inspect Color Brand Region" })
    .click();
  await expectFullScreenInspector(inspector, viewport);
  await inspector
    .getByLabel("Revision request for Color")
    .fill("Make the primary color cooler.");
  await expect(
    inspector.getByRole("button", { name: "Apply Color revision" }),
  ).toBeVisible();
  await inspector.getByRole("button", { name: "Close inspector" }).click();

  await page
    .getByRole("button", { name: "Revise complete Brand System" })
    .click();
  const systemInspector = page.getByRole("complementary", {
    name: "Brand System revision inspector",
  });
  await systemInspector
    .getByLabel("Revision request for complete Brand System")
    .fill("Make the complete system feel more direct.");
  await expect(
    systemInspector.getByRole("button", {
      name: "Apply complete Brand System revision",
    }),
  ).toBeVisible();
  await systemInspector
    .getByRole("button", { name: "Close system revision inspector" })
    .click();

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.getByRole("button", { name: "Fit Brand System" }).click();
  await color
    .getByRole("button", { name: "Inspect Color Brand Region" })
    .click();
  await expectBottomSheet(inspector, viewport);
  await inspector.getByRole("button", { name: "Focus Color" }).click();
  await context.close();
});
