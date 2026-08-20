import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9A-F]{6}$/);

const nonEmptyStringArray = z.array(z.string().trim().min(1)).min(1);

const googleFontStylesheetSchema = z
  .url()
  .refine(
    (url) => new URL(url).hostname === "fonts.googleapis.com",
    "Typography stylesheets must use Google Fonts",
  );

const allowedSvgElements = new Set([
  "circle",
  "g",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "svg",
  "title",
]);

export function sanitizeGeneratedSvg(value: string) {
  const svg = value.trim();
  if (
    svg.length > 50_000 ||
    !/^<svg\b[^>]*>[\s\S]*<\/svg>$/i.test(svg) ||
    /<\/?(?:animate|embed|foreignObject|iframe|image|link|meta|object|script|set|style|use)\b/i.test(
      svg,
    ) ||
    /\s(?:href|src|style|xlink:href|on[a-z]+)\s*=/i.test(svg) ||
    /(?:<!|<\?|\burl\s*\()/i.test(svg)
  ) {
    throw new Error("Generated SVG did not pass the safety boundary");
  }

  const elements = svg.matchAll(/<\/?([A-Za-z][\w:-]*)\b/g);
  for (const [, element] of elements) {
    if (!element || !allowedSvgElements.has(element)) {
      throw new Error("Generated SVG contains an unsupported element");
    }
  }

  return svg;
}

const safeSvgSchema = z.string().transform(sanitizeGeneratedSvg);

export const brandDirectionSchema = z.object({
  name: z.string().trim().min(1),
  concept: z.string().trim().min(1),
  attributes: z.array(z.string().trim().min(1)).length(3),
});

export const logoGenerationContentSchema = z.object({
  wordmark: z.string().trim().min(1),
  monogram: z.string().trim().min(1),
  tagline: z.string().trim().min(1),
  primaryLockupSvg: safeSvgSchema,
  wordmarkSvg: safeSvgSchema,
  symbolSvg: safeSvgSchema,
});

export const logoGenerationSchema = logoGenerationContentSchema
  .extend({
    summary: z.string().trim().min(1),
    rules: nonEmptyStringArray,
  })
  .refine(
    (logo) =>
      new Set([logo.primaryLockupSvg, logo.wordmarkSvg, logo.symbolSvg])
        .size === 3,
    "Logo variants must contain distinct SVG artwork",
  );

export const colorGenerationSchema = z.object({
  summary: z.string().trim().min(1),
  rules: nonEmptyStringArray,
  palette: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        value: hexColorSchema,
        role: z.string().trim().min(1),
        usage: z.string().trim().min(1),
        contrast: z.enum(["pass", "warning"]),
      }),
    )
    .min(5),
});

export const typographyGenerationSchema = z.object({
  summary: z.string().trim().min(1),
  rules: nonEmptyStringArray,
  display: z.string().trim().min(1),
  body: z.string().trim().min(1),
  displayFallbacks: z.array(z.string().trim().min(1)).min(2),
  bodyFallbacks: z.array(z.string().trim().min(1)).min(2),
  displayWeights: z.array(z.number().int().min(100).max(900)).min(1),
  bodyWeights: z.array(z.number().int().min(100).max(900)).min(1),
  scale: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        size: z.string().trim().min(1),
        lineHeight: z.string().trim().min(1),
        weight: z.number().int().min(100).max(900),
      }),
    )
    .min(3),
  sampleHeadline: z.string().trim().min(1),
  stylesheetUrl: googleFontStylesheetSchema,
});

export const voiceGenerationSchema = z.object({
  summary: z.string().trim().min(1),
  rules: nonEmptyStringArray,
  promise: z.string().trim().min(1),
  principles: z.array(z.string().trim().min(1)).length(3),
  preferredWords: z.array(z.string().trim().min(1)).min(3),
  avoidedWords: z.array(z.string().trim().min(1)).min(3),
  headline: z.string().trim().min(1),
  body: z.string().trim().min(1),
  callToAction: z.string().trim().min(1),
  beforeAfter: z.object({
    before: z.string().trim().min(1),
    after: z.string().trim().min(1),
  }),
});

export const photographRoles = [
  "hero",
  "product",
  "people",
  "texture",
] as const;

export const photographRoleSchema = z.enum(photographRoles);

const photographShotSchema = z.object({
  role: photographRoleSchema,
  subject: z.string().trim().min(1),
  composition: z.string().trim().min(1),
  alt: z.string().trim().min(1),
});

export const photographyDirectionSchema = z
  .object({
    summary: z.string().trim().min(1),
    aesthetic: z.string().trim().min(1),
    lighting: z.string().trim().min(1),
    palette: z.array(z.string().trim().min(1)).min(3),
    rules: nonEmptyStringArray,
    shots: z.array(photographShotSchema).length(photographRoles.length),
  })
  .refine(
    (direction) =>
      photographRoles.every(
        (role) =>
          direction.shots.filter((shot) => shot.role === role).length === 1,
      ),
    "Photography direction must contain one shot for each required role",
  );

export const brandPhotographInspectionSchema = z.object({
  hasUnintendedText: z.boolean(),
  hasVisibleWatermark: z.boolean(),
  hasThirdPartyBranding: z.boolean(),
  notes: z.string().trim().min(1),
});

export function assertSafeBrandPhotograph(value: unknown) {
  const inspection = brandPhotographInspectionSchema.parse(value);
  if (
    inspection.hasUnintendedText ||
    inspection.hasVisibleWatermark ||
    inspection.hasThirdPartyBranding
  ) {
    throw new Error(
      `Generated Brand Photograph did not pass visual inspection: ${inspection.notes}`,
    );
  }
  return inspection;
}

export function createPhotographPrompt(
  brandBrief: { companyName: string; description: string },
  direction: PhotographyDirection,
  shot: PhotographShot,
) {
  return [
    "Create one original, high quality Brand Photograph.",
    `Brand Brief: ${JSON.stringify(brandBrief)}.`,
    `Shared photography direction: ${direction.summary}`,
    `Aesthetic: ${direction.aesthetic}`,
    `Lighting: ${direction.lighting}`,
    `Palette: ${direction.palette.join(", ")}.`,
    `Direction rules: ${direction.rules.join(" ")}`,
    `Role: ${shot.role}.`,
    `Subject: ${shot.subject}`,
    `Composition: ${shot.composition}`,
    "Create original generated imagery, not stock photography.",
    "No text, lettering, captions, or typography anywhere in the image.",
    "No watermarks.",
    "No third party logos or branding.",
  ].join(" ");
}

export type BrandDirection = z.infer<typeof brandDirectionSchema>;
export type LogoGeneration = z.infer<typeof logoGenerationSchema>;
export type ColorGeneration = z.infer<typeof colorGenerationSchema>;
export type TypographyGeneration = z.infer<typeof typographyGenerationSchema>;
export type VoiceGeneration = z.infer<typeof voiceGenerationSchema>;
export type PhotographRole = z.infer<typeof photographRoleSchema>;
export type PhotographShot = z.infer<typeof photographShotSchema>;
export type PhotographyDirection = z.infer<typeof photographyDirectionSchema>;

export const progressiveRegionIds = [
  "logo",
  "color",
  "typography",
  "voice-and-tone",
] as const;

export type ProgressiveRegionId = (typeof progressiveRegionIds)[number];

function normalizedFamilyName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function stylesheetFamilyNames(stylesheetUrl: string) {
  return new URL(stylesheetUrl).searchParams
    .getAll("family")
    .map((family) => family.split(":", 1)[0] ?? "")
    .map(normalizedFamilyName);
}

function fontFaceWeights(stylesheet: string) {
  const weights = new Map<string, Array<[number, number]>>();
  for (const match of stylesheet.matchAll(/@font-face\s*{([^}]*)}/gi)) {
    const declaration = match[1] ?? "";
    const family = declaration.match(
      /font-family:\s*['"]?([^;'"\n]+)['"]?\s*;/i,
    )?.[1];
    const weight = declaration.match(/font-weight:\s*(\d+)(?:\s+(\d+))?\s*;/i);
    if (!(family && weight?.[1])) {
      continue;
    }
    const minimum = Number(weight[1]);
    const maximum = Number(weight[2] ?? weight[1]);
    const key = normalizedFamilyName(family);
    weights.set(key, [...(weights.get(key) ?? []), [minimum, maximum]]);
  }
  return weights;
}

function supportsWeight(
  availableWeights: Map<string, Array<[number, number]>>,
  family: string,
  weight: number,
) {
  return availableWeights
    .get(normalizedFamilyName(family))
    ?.some(([minimum, maximum]) => weight >= minimum && weight <= maximum);
}

export async function validateTypographyWithGoogleFonts(value: unknown) {
  const typography = typographyGenerationSchema.parse(value);
  const selectedFamilies = stylesheetFamilyNames(typography.stylesheetUrl);
  const requiredFamilies = [typography.display, typography.body].map(
    normalizedFamilyName,
  );

  if (!requiredFamilies.every((family) => selectedFamilies.includes(family))) {
    throw new Error(
      "The Google Fonts stylesheet must load both selected families",
    );
  }

  const response = await fetch(typography.stylesheetUrl, {
    headers: { "User-Agent": "Sandcastle Brand Agent" },
  });
  if (!response.ok) {
    throw new Error("The selected Google Fonts stylesheet is unavailable");
  }

  const stylesheet = await response.text();
  const availableWeights = fontFaceWeights(stylesheet);
  for (const family of requiredFamilies) {
    if (!availableWeights.has(family)) {
      throw new Error(`Google Fonts did not return the ${family} family`);
    }
  }

  for (const [family, weights] of [
    [typography.display, typography.displayWeights],
    [typography.body, typography.bodyWeights],
  ] as const) {
    for (const weight of weights) {
      if (!supportsWeight(availableWeights, family, weight)) {
        throw new Error(
          `Google Fonts did not return ${family} weight ${weight}`,
        );
      }
    }
  }

  return typography;
}
