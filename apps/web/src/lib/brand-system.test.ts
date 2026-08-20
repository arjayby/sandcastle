import { describe, expect, test } from "vitest";

import { createProgressiveBrandSystem } from "./brand-system";

describe("progressive Brand Photographs", () => {
  test("keeps ready photographs when another role fails", () => {
    const direction = {
      summary: "Observed teamwork shaped by warm directional light.",
      aesthetic: "Documentary, tactile, composed, and quietly optimistic.",
      lighting: "Low winter sunlight with gentle natural shadow.",
      palette: ["Harbor ink", "Signal gold", "Warm paper"],
      rules: ["Favor candid moments over staged collaboration."],
      shots: [
        {
          role: "hero",
          subject: "A calm planning studio.",
          composition: "Wide environmental composition.",
          alt: "A small team planning in a sunlit studio",
        },
        {
          role: "product",
          subject: "A planning tool beside physical notes.",
          composition: "Close three quarter view.",
          alt: "A planning tool in use beside physical notes",
        },
        {
          role: "people",
          subject: "Two collaborators reviewing a decision.",
          composition: "Natural mid shot.",
          alt: "Two collaborators reviewing a decision",
        },
        {
          role: "texture",
          subject: "Layered paper and botanical shadow.",
          composition: "Abstract overhead crop.",
          alt: "Layered paper under a botanical shadow",
        },
      ],
    };

    const system = createProgressiveBrandSystem("Northstar", {
      generationStage: "photography",
      photographyDirectionJson: JSON.stringify(direction),
      photographs: [
        {
          role: "hero",
          state: "ready",
          alt: direction.shots[0].alt,
          url: "https://example.test/hero.png",
        },
        {
          role: "product",
          state: "failed",
          alt: direction.shots[1].alt,
        },
        {
          role: "people",
          state: "generating",
          alt: direction.shots[2].alt,
        },
        {
          role: "texture",
          state: "generating",
          alt: direction.shots[3].alt,
        },
      ],
    });
    const photography = system.regions.find(
      (region) => region.id === "photography",
    );

    expect(photography?.state).toBe("generating");
    expect(photography?.content.photographs).toEqual([
      expect.objectContaining({
        role: "hero",
        state: "ready",
        url: "https://example.test/hero.png",
      }),
      expect.objectContaining({ role: "product", state: "failed" }),
      expect.objectContaining({ role: "people", state: "generating" }),
      expect.objectContaining({ role: "texture", state: "generating" }),
    ]);
  });
});

describe("Progressive Generation recovery", () => {
  test("keeps a ready Brand Region unchanged when the next region fails", () => {
    const logoJson = JSON.stringify({
      summary: "A clear directional mark.",
      rules: ["Keep clear space around the mark."],
      wordmark: "NORTHSTAR",
      monogram: "N",
      tagline: "Plan with a clearer signal.",
      primaryLockupSvg:
        '<svg viewBox="0 0 20 20"><title>Primary</title><path d="M0 0h20v20H0z"/></svg>',
      wordmarkSvg:
        '<svg viewBox="0 0 20 20"><title>Wordmark</title><path d="M0 4h20v4H0z"/></svg>',
      symbolSvg:
        '<svg viewBox="0 0 20 20"><title>Symbol</title><circle cx="10" cy="10" r="8"/></svg>',
    });

    const system = createProgressiveBrandSystem("Northstar", {
      generationStage: "color",
      generationError: "Provider offline",
      logoJson,
    });

    expect(system.regions[0]).toMatchObject({
      id: "logo",
      state: "ready",
      summary: "A clear directional mark.",
    });
    expect(system.regions[1]).toMatchObject({ id: "color", state: "failed" });
  });

  test("loads the polished built in fallback through the Brand System contract", () => {
    const system = createProgressiveBrandSystem("Northstar", {
      generationStage: "direction",
      generationError: "Provider offline",
      builtInFallback: true,
    });

    expect(system.contractVersion).toBe(1);
    expect(system.name).toBe("Northstar");
    expect(system.regions.every((region) => region.state === "ready")).toBe(
      true,
    );
  });
});
