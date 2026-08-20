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

export const logoGenerationSchema = z.object({
  summary: z.string().trim().min(1),
  rules: nonEmptyStringArray,
  wordmark: z.string().trim().min(1),
  monogram: z.string().trim().min(1),
  tagline: z.string().trim().min(1),
  primaryLockupSvg: safeSvgSchema,
  wordmarkSvg: safeSvgSchema,
  symbolSvg: safeSvgSchema,
});

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

export type BrandDirection = z.infer<typeof brandDirectionSchema>;
export type LogoGeneration = z.infer<typeof logoGenerationSchema>;
export type ColorGeneration = z.infer<typeof colorGenerationSchema>;
export type TypographyGeneration = z.infer<typeof typographyGenerationSchema>;
export type VoiceGeneration = z.infer<typeof voiceGenerationSchema>;

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

  const stylesheet = (await response.text()).toLowerCase();
  for (const family of requiredFamilies) {
    if (!stylesheet.includes(`font-family: '${family}'`)) {
      throw new Error(`Google Fonts did not return the ${family} family`);
    }
  }

  for (const weight of [
    ...typography.displayWeights,
    ...typography.bodyWeights,
  ]) {
    if (!stylesheet.includes(`font-weight: ${weight}`)) {
      throw new Error(`Google Fonts did not return weight ${weight}`);
    }
  }

  return typography;
}
