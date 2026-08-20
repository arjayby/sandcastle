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
