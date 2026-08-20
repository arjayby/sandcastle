import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9A-F]{6}$/);

const nonEmptyStringArray = z.array(z.string().trim().min(1)).min(1);
const tokenNameSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
const cssDurationSchema = z
  .string()
  .regex(/^\d+(?:\.\d+)?m?s$/, "Motion duration must be a CSS time value")
  .refine((value) => {
    const match = value.match(/^(\d+(?:\.\d+)?)(m?s)$/);
    if (!match?.[1]) {
      return false;
    }
    const milliseconds = Number(match[1]) * (match[2] === "s" ? 1000 : 1);
    return milliseconds >= 80 && milliseconds <= 1000;
  }, "Motion duration must be between 80ms and 1000ms");
const cssEasingSchema = z
  .string()
  .regex(
    /^cubic-bezier\(\s*-?(?:\d+|\d*\.\d+)\s*,\s*-?(?:\d+|\d*\.\d+)\s*,\s*-?(?:\d+|\d*\.\d+)\s*,\s*-?(?:\d+|\d*\.\d+)\s*\)$/,
    "Motion easing must be a CSS cubic-bezier value",
  )
  .refine((value) => {
    const coordinates = value.match(/-?(?:\d*\.\d+|\d+)/g)?.map(Number);
    return (
      coordinates?.length === 4 &&
      (coordinates[0] ?? -1) >= 0 &&
      (coordinates[0] ?? 2) <= 1 &&
      (coordinates[2] ?? -1) >= 0 &&
      (coordinates[2] ?? 2) <= 1
    );
  }, "Motion easing x coordinates must be between 0 and 1");
const safeCssTokenValueSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => !/[;{}]/.test(value),
    "Token values cannot contain CSS declaration delimiters",
  );
const cssDimensionSchema = safeCssTokenValueSchema.regex(
  /^(?:0|\d+(?:\.\d+)?(?:px|rem|em))$/,
  "Token must be a zero or CSS length value",
);
const cssLineHeightSchema = safeCssTokenValueSchema.regex(
  /^(?:\d+(?:\.\d+)?|\d+(?:\.\d+)?(?:px|rem|em))$/,
  "Line height must be a unitless number or CSS length value",
);
const cssFontStackSchema = safeCssTokenValueSchema.regex(
  /^(?:"[^"]+"|'[^']+'|[A-Za-z][A-Za-z0-9 -]*)(?:\s*,\s*(?:"[^"]+"|'[^']+'|[A-Za-z][A-Za-z0-9 -]*))*$/,
  "Font token must be a valid CSS font family stack",
);
const cssLengthPattern = "(?:0|-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:px|rem|em))";
const cssRgbChannelPattern = "\\d+(?:\\.\\d+)?%?";
const cssColorPattern = `(?:#[0-9A-Fa-f]{3,8}|rgba?\\(\\s*${cssRgbChannelPattern}(?:\\s*,\\s*${cssRgbChannelPattern}){2}(?:\\s*,\\s*(?:0|1|0?\\.\\d+))?\\s*\\))`;
const cssShadowSchema = safeCssTokenValueSchema.regex(
  new RegExp(
    `^(?:none|${cssLengthPattern}\\s+${cssLengthPattern}(?:\\s+${cssLengthPattern}){0,2}\\s+${cssColorPattern})$`,
  ),
  "Shadow token must be none or a valid CSS box shadow",
);
const dimensionTokenRecordSchema = z
  .record(tokenNameSchema, cssDimensionSchema)
  .refine((tokens) => Object.keys(tokens).length > 0, "Tokens are required");
const shadowTokenRecordSchema = z
  .record(tokenNameSchema, cssShadowSchema)
  .refine((tokens) => Object.keys(tokens).length > 0, "Tokens are required");

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

const requiredColorRoles = [
  "foundation",
  "primary",
  "support",
  "accent",
  "surface",
] as const;

export const colorGenerationSchema = z
  .object({
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
  })
  .superRefine((color, ctx) => {
    const roles = new Set(
      color.palette.map(({ role }) => role.trim().toLowerCase()),
    );
    for (const role of requiredColorRoles) {
      if (!roles.has(role)) {
        ctx.addIssue({
          code: "custom",
          path: ["palette"],
          message: `Color palette must include the ${role} role`,
        });
      }
    }
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
        size: cssDimensionSchema,
        lineHeight: cssLineHeightSchema,
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

export const motionGenerationSchema = z.object({
  summary: z.string().trim().min(1),
  rules: nonEmptyStringArray,
  principle: z.string().trim().min(1),
  duration: cssDurationSchema,
  easing: cssEasingSchema,
});

export const interfaceGenerationSchema = z.object({
  summary: z.string().trim().min(1),
  rules: nonEmptyStringArray,
  principle: z.string().trim().min(1),
  components: z.array(z.string().trim().min(1)).min(5),
  example: z.object({
    brandName: z.string().trim().min(1),
    headline: z.string().trim().min(1),
    body: z.string().trim().min(1),
    callToAction: z.string().trim().min(1),
    secondaryAction: z.string().trim().min(1),
    cardTitle: z.string().trim().min(1),
    cardDescription: z.string().trim().min(1),
    inputLabel: z.string().trim().min(1),
    inputPlaceholder: z.string().trim().min(1),
    navigation: z.array(z.string().trim().min(1)).length(3),
  }),
});

export const designTokensGenerationSchema = z.object({
  summary: z.string().trim().min(1),
  rules: nonEmptyStringArray,
  colors: z
    .record(tokenNameSchema, hexColorSchema)
    .refine(
      (tokens) => Object.keys(tokens).length >= 5,
      "At least five color tokens are required",
    ),
  fonts: z.object({
    display: cssFontStackSchema,
    body: cssFontStackSchema,
  }),
  typeScale: dimensionTokenRecordSchema,
  spacing: dimensionTokenRecordSchema,
  radius: dimensionTokenRecordSchema,
  shadows: shadowTokenRecordSchema,
  motion: z.object({
    duration: cssDurationSchema,
    easing: cssEasingSchema,
  }),
});

export type BrandDirection = z.infer<typeof brandDirectionSchema>;
export type LogoGeneration = z.infer<typeof logoGenerationSchema>;
export type ColorGeneration = z.infer<typeof colorGenerationSchema>;
export type TypographyGeneration = z.infer<typeof typographyGenerationSchema>;
export type VoiceGeneration = z.infer<typeof voiceGenerationSchema>;
export type MotionGeneration = z.infer<typeof motionGenerationSchema>;
export type InterfaceGeneration = z.infer<typeof interfaceGenerationSchema>;
export type DesignTokensGeneration = z.infer<
  typeof designTokensGenerationSchema
>;

export const progressiveRegionIds = [
  "logo",
  "color",
  "typography",
  "voice-and-tone",
  "motion",
  "interface-foundation",
  "design-tokens",
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
