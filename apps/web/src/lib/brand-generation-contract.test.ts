import {
  createPhotographPrompt,
  logoGenerationSchema,
  photographyDirectionSchema,
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
    const safeWordmarkSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><title>Northstar wordmark</title><path fill="#17231F" d="M8 24h224v16H8z"/></svg>';
    const safeSymbolSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><title>Northstar symbol</title><circle fill="#17231F" cx="40" cy="40" r="32"/></svg>';

    expect(sanitizeGeneratedSvg(safeSvg)).toBe(safeSvg);
    expect(
      logoGenerationSchema.parse({
        summary: "A precise signal for confident navigation.",
        rules: ["Keep clear space around the mark."],
        wordmark: "NORTHSTAR",
        monogram: "N",
        tagline: "Plan with a clearer signal.",
        primaryLockupSvg: safeSvg,
        wordmarkSvg: safeWordmarkSvg,
        symbolSvg: safeSymbolSvg,
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

  test("rejects identical SVGs presented as three logo variants", () => {
    const safeSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><title>Mark</title><path d="M8 8h64v64H8z"/></svg>';

    expect(() =>
      logoGenerationSchema.parse({
        summary: "A precise signal.",
        rules: ["Keep clear space around the mark."],
        wordmark: "NORTHSTAR",
        monogram: "N",
        tagline: "Plan clearly.",
        primaryLockupSvg: safeSvg,
        wordmarkSvg: safeSvg,
        symbolSvg: safeSvg,
      }),
    ).toThrow();
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
              "@font-face { font-family: 'Inter'; font-weight: 400; }",
              "@font-face { font-family: 'Inter'; font-weight: 500; }",
              "@font-face { font-family: 'Inter'; font-weight: 600; }",
              "@font-face { font-family: 'Newsreader'; font-weight: 400; }",
              "@font-face { font-family: 'Newsreader'; font-weight: 600; }",
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

  test("rejects a weight supplied only by the other selected family", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            [
              "@font-face { font-family: 'Inter'; font-weight: 400; }",
              "@font-face { font-family: 'Inter'; font-weight: 500; }",
              "@font-face { font-family: 'Inter'; font-weight: 600; }",
              "@font-face { font-family: 'Newsreader'; font-weight: 400; }",
            ].join("\n"),
          ),
        ),
    );

    await expect(validateTypographyWithGoogleFonts(typography)).rejects.toThrow(
      "Newsreader weight 600",
    );
  });
});

describe("Brand Photograph generation contract", () => {
  const direction = {
    summary: "Observed teamwork shaped by warm directional light.",
    aesthetic: "Documentary, tactile, composed, and quietly optimistic.",
    lighting: "Low winter sunlight with gentle natural shadow.",
    palette: ["Harbor ink", "Signal gold", "Warm paper"],
    rules: [
      "Favor candid moments over staged collaboration.",
      "Keep materials tactile and believable.",
    ],
    shots: [
      {
        role: "hero" as const,
        subject: "A calm studio where a small team shapes a plan.",
        composition: "Wide environmental composition with open copy space.",
        alt: "A small team planning together in a sunlit studio",
      },
      {
        role: "product" as const,
        subject: "A planning tool being used beside physical notes.",
        composition: "Close three quarter view with hands in frame.",
        alt: "A planning tool in use beside handwritten notes",
      },
      {
        role: "people" as const,
        subject: "Two collaborators reviewing a shared decision.",
        composition: "Natural mid shot with unposed expressions.",
        alt: "Two collaborators reviewing a decision together",
      },
      {
        role: "texture" as const,
        subject: "Layered paper, graphite, and botanical shadow.",
        composition: "Abstract overhead crop with generous negative space.",
        alt: "Layered paper and graphite under a botanical shadow",
      },
    ],
  };

  test("requires one aligned shot plan for every photography role", () => {
    expect(photographyDirectionSchema.parse(direction)).toEqual(direction);

    expect(() =>
      photographyDirectionSchema.parse({
        ...direction,
        shots: direction.shots.map((shot) => ({
          ...shot,
          role: "hero",
        })),
      }),
    ).toThrow("one shot for each required role");
  });

  test("builds requests from the shared direction with brand safety exclusions", () => {
    const prompt = createPhotographPrompt(
      {
        companyName: "Northstar",
        description: "A planning tool for independent product teams.",
      },
      direction,
      direction.shots[0],
    );

    expect(prompt).toContain(direction.aesthetic);
    expect(prompt).toContain(direction.lighting);
    expect(prompt).toContain(direction.shots[0].subject);
    expect(prompt).toContain("No text, lettering, captions, or typography");
    expect(prompt).toContain("No watermarks");
    expect(prompt).toContain("No third party logos or branding");
  });
});
