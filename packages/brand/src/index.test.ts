import { describe, expect, it } from "vitest";

import {
  colors,
  corners,
  getContrastRatio,
  motion,
  productShell,
  spacing,
  tokenNames,
  typeRoles,
} from "./index";

describe("Sandcastle brand public exports", () => {
  it("publishes the approved foundation without entering the generated Brand System namespace", () => {
    expect(colors).toEqual({
      ink: "#20201E",
      paper: "#F7F3E8",
      sand: "#D9CEB8",
      amber: "#F4C95D",
      surface: "#FFFDF8",
      muted: "#6B675E",
    });
    expect(typeRoles).toMatchObject({
      display: { family: "Instrument Serif" },
      interface: { family: "Inter" },
      technical: { family: "Geist Mono" },
    });
    expect(spacing).toMatchObject({ unit: "8px", panel: "24px" });
    expect(corners).toEqual({ control: "8px", panel: "12px", round: "999px" });
    expect(productShell).toHaveProperty("light");
    expect(productShell).toHaveProperty("dark");
    expect(tokenNames.every((name) => name.startsWith("--sc-"))).toBe(true);
    expect(tokenNames.some((name) => name.startsWith("--brand-"))).toBe(false);
  });

  it("keeps normal interface motion inside the approved duration range", () => {
    expect(motion.fast.durationMs).toBeGreaterThanOrEqual(160);
    expect(motion.fast.durationMs).toBeLessThanOrEqual(240);
    expect(motion.normal.durationMs).toBeGreaterThanOrEqual(160);
    expect(motion.normal.durationMs).toBeLessThanOrEqual(240);
  });

  it.each([
    ["Ink on Paper", colors.ink, colors.paper],
    ["Ink on Sand", colors.ink, colors.sand],
    ["Ink on Amber", colors.ink, colors.amber],
    ["Ink on Surface", colors.ink, colors.surface],
    ["Muted on Paper", colors.muted, colors.paper],
    ["Muted on Surface", colors.muted, colors.surface],
  ])("meets WCAG AA for %s", (_name, foreground, background) => {
    expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
