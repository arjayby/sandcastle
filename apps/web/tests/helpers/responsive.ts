import { expect, type Locator } from "@playwright/test";

export async function expectBottomSheet(inspector: Locator, viewport: Locator) {
  const [viewportBox, inspectorBox] = await Promise.all([
    viewport.boundingBox(),
    inspector.boundingBox(),
  ]);
  expect(viewportBox).not.toBeNull();
  expect(inspectorBox).not.toBeNull();
  if (!(viewportBox && inspectorBox)) {
    return;
  }

  expect(inspectorBox.width).toBeGreaterThan(viewportBox.width * 0.9);
  expect(inspectorBox.y).toBeGreaterThan(
    viewportBox.y + viewportBox.height * 0.35,
  );
}

export async function expectFullScreenInspector(
  inspector: Locator,
  viewport: Locator,
) {
  const [viewportBox, inspectorBox] = await Promise.all([
    viewport.boundingBox(),
    inspector.boundingBox(),
  ]);
  expect(viewportBox).not.toBeNull();
  expect(inspectorBox).not.toBeNull();
  if (!(viewportBox && inspectorBox)) {
    return;
  }

  expect(inspectorBox.x).toBeCloseTo(viewportBox.x, 0);
  expect(inspectorBox.y).toBeCloseTo(viewportBox.y, 0);
  expect(inspectorBox.width).toBeCloseTo(viewportBox.width, 0);
  expect(inspectorBox.height).toBeCloseTo(viewportBox.height, 0);
}
