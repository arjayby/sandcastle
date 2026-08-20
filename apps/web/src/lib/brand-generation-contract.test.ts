import {
  assertSafeBrandPhotograph,
  colorGenerationSchema,
  createPhotographPrompt,
  designTokensGenerationSchema,
  interfaceGenerationSchema,
  logoGenerationSchema,
  motionGenerationSchema,
  photographyDirectionSchema,
  sanitizeGeneratedSvg,
  typographyGenerationSchema,
  validateTypographyWithGoogleFonts,
} from "@sandcastle/backend/convex/brandGenerationContract";
import { claimBrandProjectOperation } from "@sandcastle/backend/convex/brandOperationContract";
import { runProviderRequest } from "@sandcastle/backend/convex/providerResponseContract";
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Brand Agent provider response contract", () => {
  const responseSchema = motionGenerationSchema;
  const validResponse = {
    summary: "Measured motion that confirms progress.",
    rules: ["Movement arrives softly."],
    principle: "Lift, travel, settle",
    duration: "320ms",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  };

  test("accepts a valid provider response", async () => {
    await expect(
      runProviderRequest({
        request: async () => validResponse,
        schema: responseSchema,
        timeoutMs: 100,
      }),
    ).resolves.toEqual({
      ok: true,
      value: validResponse,
      attempts: 1,
    });
  });

  test.each([
    ["invalid", { ...validResponse, duration: "eventually" }],
    ["partial", { summary: validResponse.summary }],
  ])(
    "sends an %s provider response through the provider failure path",
    async (_responseType, response) => {
      await expect(
        runProviderRequest({
          request: async () => response,
          schema: responseSchema,
          timeoutMs: 100,
        }),
      ).resolves.toMatchObject({
        ok: false,
        attempts: 2,
        error: expect.any(String),
      });
    },
  );

  test("times out and retries a provider that never responds", async () => {
    await expect(
      runProviderRequest({
        request: () => new Promise(() => undefined),
        schema: responseSchema,
        timeoutMs: 5,
      }),
    ).resolves.toEqual({
      ok: false,
      attempts: 2,
      error: "Brand Agent provider timed out after 5ms",
    });
  });

  test("retries a failed provider response once", async () => {
    const request = vi.fn().mockRejectedValue(new Error("Provider offline"));

    await expect(
      runProviderRequest({ request, schema: responseSchema, timeoutMs: 100 }),
    ).resolves.toEqual({
      ok: false,
      attempts: 2,
      error: "Provider offline",
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  test("returns a valid response from the automatic retry", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("Transient provider error"))
      .mockResolvedValue(validResponse);

    await expect(
      runProviderRequest({ request, schema: responseSchema, timeoutMs: 100 }),
    ).resolves.toEqual({ ok: true, value: validResponse, attempts: 2 });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("Brand Project operation contract", () => {
  test.each([
    ["generation", "revision"],
    ["revision", "generation"],
  ] as const)(
    "blocks a %s operation while a %s operation is active",
    (requestedKind, activeKind) => {
      expect(() =>
        claimBrandProjectOperation(
          { id: "active-operation", kind: activeKind },
          requestedKind,
          "new-operation",
        ),
      ).toThrow("already active");
    },
  );

  test("claims an operation when the Brand Project is idle", () => {
    expect(
      claimBrandProjectOperation(null, "revision", "new-operation"),
    ).toEqual({ id: "new-operation", kind: "revision" });
  });
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

  test("rejects type scale values that cannot become CSS tokens", () => {
    expect(() =>
      typographyGenerationSchema.parse({
        ...typography,
        scale: [
          ...typography.scale.slice(0, 2),
          { name: "Body", size: "banana", lineHeight: "soon", weight: 400 },
        ],
      }),
    ).toThrow();
  });
});

describe("applied Brand Region generation contract", () => {
  test("accepts practical motion, interface, and design token results", () => {
    expect(
      motionGenerationSchema.parse({
        summary: "Measured motion that confirms progress.",
        rules: ["Movement arrives softly."],
        principle: "Lift, travel, settle",
        duration: "320ms",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }),
    ).toBeDefined();

    expect(
      interfaceGenerationSchema.parse({
        summary: "Calm surfaces with direct controls.",
        rules: ["Reserve the accent color for primary actions."],
        principle: "Editorial calm, product clarity",
        components: ["Buttons", "Inputs", "Cards", "Navigation", "Website"],
        example: {
          brandName: "Northstar",
          headline: "Find the clearest way forward.",
          body: "Bring plans and progress into one calm view.",
          callToAction: "Set your direction",
          secondaryAction: "See the approach",
          cardTitle: "Project rhythm",
          cardDescription: "A calm weekly overview.",
          inputLabel: "Email address",
          inputPlaceholder: "you@example.com",
          navigation: ["Approach", "Work", "About"],
        },
      }),
    ).toBeDefined();

    expect(
      designTokensGenerationSchema.parse({
        summary: "Production values for every application.",
        rules: ["Use tokens as the interface source of truth."],
        colors: {
          ink: "#17231F",
          primary: "#EDB33F",
          support: "#B7CEB7",
          accent: "#D57658",
          surface: "#F4EFE5",
        },
        fonts: {
          display: "Newsreader, Georgia, serif",
          body: "Inter, Arial, sans-serif",
        },
        typeScale: { display: "72px", heading: "36px", body: "18px" },
        spacing: { small: "8px", medium: "16px", large: "32px" },
        radius: { control: "8px", card: "12px" },
        shadows: {
          card: "0 18px 50px rgba(23, 35, 31, 0.12)",
        },
        motion: {
          duration: "320ms",
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      }),
    ).toBeDefined();
  });

  test("rejects motion values that are not suitable CSS interface tokens", () => {
    const motion = {
      summary: "Motion without practical values.",
      rules: ["Move quickly."],
      principle: "Bounce forever",
      duration: "320ms",
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    };

    for (const invalidMotion of [
      { ...motion, duration: "0ms" },
      { ...motion, duration: "12s" },
      { ...motion, duration: "eventually" },
      { ...motion, easing: "cubic-bezier(1.5, 0, -0.2, 1)" },
      { ...motion, easing: "springy" },
    ]) {
      expect(() => motionGenerationSchema.parse(invalidMotion)).toThrow();
    }
  });

  test("rejects token values that could break generated CSS", () => {
    const tokens = {
      summary: "Unsafe tokens.",
      rules: ["Keep values valid."],
      colors: {
        ink: "#17231F",
        primary: "#EDB33F",
        support: "#B7CEB7",
        accent: "#D57658",
        surface: "#F4EFE5",
      },
      fonts: { display: "Newsreader, Georgia, serif", body: "Inter, Arial" },
      typeScale: { body: "18px" },
      spacing: { medium: "16px" },
      radius: { card: "12px" },
      shadows: { card: "none" },
      motion: {
        duration: "320ms",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    };

    for (const invalidTokens of [
      { ...tokens, fonts: { ...tokens.fonts, display: '"Newsreader' } },
      { ...tokens, spacing: { medium: "banana" } },
      { ...tokens, radius: { card: "12px; }" } },
      { ...tokens, typeScale: { body: "large" } },
      { ...tokens, shadows: { card: "0 2px )" } },
    ]) {
      expect(() => designTokensGenerationSchema.parse(invalidTokens)).toThrow();
    }
  });

  test("requires the semantic color roles used by applied regions", () => {
    expect(() =>
      colorGenerationSchema.parse({
        summary: "Motion without practical values.",
        rules: ["Use color consistently."],
        palette: ["One", "Two", "Three", "Four", "Five"].map((name) => ({
          name,
          value: "#17231F",
          role: "Decoration",
          usage: "Accents",
          contrast: "pass" as const,
        })),
      }),
    ).toThrow();
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

  test("rejects imagery that inspection finds unsafe for the Brand System", () => {
    expect(() =>
      assertSafeBrandPhotograph({
        hasUnintendedText: true,
        hasVisibleWatermark: false,
        hasThirdPartyBranding: false,
        notes: "A stray caption is visible in the lower corner.",
      }),
    ).toThrow("did not pass visual inspection");

    expect(
      assertSafeBrandPhotograph({
        hasUnintendedText: false,
        hasVisibleWatermark: false,
        hasThirdPartyBranding: false,
        notes: "No unsafe visual elements found.",
      }),
    ).toEqual({
      hasUnintendedText: false,
      hasVisibleWatermark: false,
      hasThirdPartyBranding: false,
      notes: "No unsafe visual elements found.",
    });
  });
});
