import {
  logoGenerationSchema,
  sanitizeGeneratedSvg,
} from "@sandcastle/backend/convex/brandGenerationContract";
import { describe, expect, test } from "vitest";

describe("generated logo safety boundary", () => {
  test("accepts constrained logo SVG", () => {
    const safeSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><title>Northstar wordmark</title><path fill="#17231F" d="M8 8h64v64H8z"/></svg>';

    expect(sanitizeGeneratedSvg(safeSvg)).toBe(safeSvg);
    expect(
      logoGenerationSchema.parse({
        summary: "A precise signal for confident navigation.",
        rules: ["Keep clear space around the mark."],
        wordmark: "NORTHSTAR",
        monogram: "N",
        tagline: "Plan with a clearer signal.",
        primaryLockupSvg: safeSvg,
        wordmarkSvg: safeSvg,
        symbolSvg: safeSvg,
      }),
    ).toBeDefined();
  });

  test("rejects executable or externally loaded SVG", () => {
    const unsafeSvgs = [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/tracker.png"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject>bad</foreignObject></svg>',
    ];

    for (const svg of unsafeSvgs) {
      expect(() => sanitizeGeneratedSvg(svg)).toThrow();
    }
  });
});
