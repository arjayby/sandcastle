import {
  logoGenerationSchema,
  sanitizeGeneratedSvg,
  validateTypographyWithGoogleFonts,
} from "@sandcastle/backend/convex/brandGenerationContract";
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("Google Fonts generation contract", () => {
  const typography = {
    summary: "A useful type system.",
    rules: ["Use display type for short headlines."],
    display: "Newsreader",
    body: "Inter",
    displayFallbacks: ["Georgia", "serif"],
    bodyFallbacks: ["Arial", "sans-serif"],
    displayWeights: [400, 600],
    bodyWeights: [400, 500, 600],
    scale: [
      { name: "Display", size: "72px", lineHeight: "68px", weight: 600 },
      { name: "Heading", size: "36px", lineHeight: "40px", weight: 600 },
      { name: "Body", size: "18px", lineHeight: "28px", weight: 400 },
    ],
    sampleHeadline: "A clear way forward.",
    stylesheetUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:wght@400;600&display=swap",
  };

  test("confirms both selected families and declared weights", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            [
              "font-family: 'Inter'; font-weight: 400;",
              "font-family: 'Inter'; font-weight: 500;",
              "font-family: 'Inter'; font-weight: 600;",
              "font-family: 'Newsreader'; font-weight: 400;",
              "font-family: 'Newsreader'; font-weight: 600;",
            ].join("\n"),
          ),
        ),
    );

    await expect(
      validateTypographyWithGoogleFonts(typography),
    ).resolves.toEqual(typography);
  });

  test("rejects a stylesheet that omits a selected family", async () => {
    await expect(
      validateTypographyWithGoogleFonts({
        ...typography,
        stylesheetUrl:
          "https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600&display=swap",
      }),
    ).rejects.toThrow("both selected families");
  });
});
