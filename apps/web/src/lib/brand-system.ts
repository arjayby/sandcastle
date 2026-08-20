import {
  brandDirectionSchema,
  colorGenerationSchema,
  logoGenerationContentSchema,
  logoGenerationSchema,
  typographyGenerationSchema,
  voiceGenerationSchema,
} from "@sandcastle/backend/convex/brandGenerationContract";
import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9A-F]{6}$/);
const frameSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const sharedRegionShape = {
  state: z.enum(["unfinished", "generating", "ready", "revising", "failed"]),
  frame: frameSchema,
  summary: z.string().min(1),
  rules: z.array(z.string().min(1)).min(1),
};

const typographyContentSchema = typographyGenerationSchema.omit({
  summary: true,
  rules: true,
});

const voiceContentSchema = voiceGenerationSchema.omit({
  summary: true,
  rules: true,
});

const logoRegionSchema = z.object({
  ...sharedRegionShape,
  id: z.literal("logo"),
  name: z.literal("Logo"),
  content: logoGenerationContentSchema.extend({
    variants: z.array(z.string().min(1)).min(3),
  }),
});

const colorRegionSchema = z.object({
  ...sharedRegionShape,
  id: z.literal("color"),
  name: z.literal("Color"),
  content: z.object({ palette: colorGenerationSchema.shape.palette }),
});

const typographyRegionSchema = z.object({
  ...sharedRegionShape,
  id: z.literal("typography"),
  name: z.literal("Typography"),
  content: typographyContentSchema,
});

const voiceRegionSchema = z.object({
  ...sharedRegionShape,
  id: z.literal("voice-and-tone"),
  name: z.literal("Voice and Tone"),
  content: voiceContentSchema,
});

const photographyRegionSchema = z.object({
  ...sharedRegionShape,
  id: z.literal("photography"),
  name: z.literal("Photography"),
  content: z.object({
    direction: z.string().min(1),
    photographs: z
      .array(
        z.object({
          role: z.enum(["Hero", "Product", "People", "Texture"]),
          alt: z.string().min(1),
          colors: z.tuple([hexColorSchema, hexColorSchema, hexColorSchema]),
        }),
      )
      .length(4),
  }),
});

const motionRegionSchema = z.object({
  ...sharedRegionShape,
  id: z.literal("motion"),
  name: z.literal("Motion"),
  content: z.object({
    principle: z.string().min(1),
    duration: z.string().min(1),
    easing: z.string().min(1),
  }),
});

const interfaceRegionSchema = z.object({
  ...sharedRegionShape,
  id: z.literal("interface-foundation"),
  name: z.literal("Interface Foundation"),
  content: z.object({
    principle: z.string().min(1),
    components: z.array(z.string().min(1)).min(5),
    example: z.object({
      brandName: z.string().min(1),
      headline: z.string().min(1),
      callToAction: z.string().min(1),
      cardTitle: z.string().min(1),
      cardDescription: z.string().min(1),
      inputPlaceholder: z.string().min(1),
      actionLabel: z.string().min(1),
    }),
  }),
});

const designTokensRegionSchema = z.object({
  ...sharedRegionShape,
  id: z.literal("design-tokens"),
  name: z.literal("Design Tokens"),
  content: z.object({
    css: z.string().min(1),
    json: z.record(z.string(), z.string()),
  }),
});

export const brandSystemSchema = z.object({
  contractVersion: z.literal(1),
  name: z.string().min(1),
  direction: z.object({
    name: z.string().min(1),
    concept: z.string().min(1),
    attributes: z.array(z.string().min(1)).length(3),
  }),
  theme: z.object({
    ink: hexColorSchema,
    saffron: hexColorSchema,
    aloe: hexColorSchema,
    clay: hexColorSchema,
    paper: hexColorSchema,
    surface: hexColorSchema,
    muted: hexColorSchema,
  }),
  board: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    background: z.literal("warm-paper"),
  }),
  regions: z.tuple([
    logoRegionSchema,
    colorRegionSchema,
    typographyRegionSchema,
    voiceRegionSchema,
    photographyRegionSchema,
    motionRegionSchema,
    interfaceRegionSchema,
    designTokensRegionSchema,
  ]),
});

export type BrandSystem = z.infer<typeof brandSystemSchema>;
export type BrandRegion = BrandSystem["regions"][number];

const fallbackTheme = {
  ink: "#17231F",
  saffron: "#EDB33F",
  aloe: "#B7CEB7",
  clay: "#D57658",
  paper: "#F4EFE5",
  surface: "#FBF8F1",
  muted: "#536059",
} as const;

const fallbackTypography = {
  display: "Newsreader",
  body: "Inter",
  stylesheetUrl:
    "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap",
} as const;

const fallbackMotion = {
  duration: "320ms",
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

const fallbackCardRadius = "12px";
const fallbackLogoSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><title>Morrow mark</title><path fill="#17231F" d="M12 12h56v56H12zM88 24h136v12H88zM88 48h104v10H88z"/></svg>';

export function createFallbackBrandSystem(projectName: string): BrandSystem {
  return brandSystemSchema.parse({
    contractVersion: 1,
    name: projectName,
    direction: {
      name: "Quiet momentum",
      concept:
        "A grounded identity that makes complex work feel calm, human, and possible.",
      attributes: ["Warm", "Assured", "Clear"],
    },
    board: {
      width: 1760,
      height: 1430,
      background: "warm-paper",
    },
    theme: fallbackTheme,
    regions: [
      {
        id: "logo",
        name: "Logo",
        state: "ready",
        frame: { x: 60, y: 60, width: 620, height: 420 },
        summary: "A rising mark built from one continuous gesture.",
        rules: [
          "Use the primary lockup whenever horizontal space allows.",
          "Keep one monogram width of clear space around every mark.",
          "Never stretch, outline, or add effects to the mark.",
        ],
        content: {
          wordmark: "MORROW",
          monogram: "M",
          tagline: "Make room for meaningful work.",
          variants: ["Primary lockup", "Wordmark", "Monogram"],
          primaryLockupSvg: fallbackLogoSvg,
          wordmarkSvg: fallbackLogoSvg,
          symbolSvg: fallbackLogoSvg,
        },
      },
      {
        id: "color",
        name: "Color",
        state: "ready",
        frame: { x: 720, y: 60, width: 420, height: 420 },
        summary: "Sunlit warmth balanced by a deep botanical ink.",
        rules: [
          "Saffron leads every primary action.",
          "Ink carries text and anchors large fields.",
          "Use Aloe and Clay as supporting moments, never competing accents.",
        ],
        content: {
          palette: [
            {
              name: "Ink",
              value: fallbackTheme.ink,
              role: "Foundation",
              usage: "Text and anchoring surfaces",
              contrast: "pass",
            },
            {
              name: "Saffron",
              value: fallbackTheme.saffron,
              role: "Primary",
              usage: "Primary actions",
              contrast: "pass",
            },
            {
              name: "Aloe",
              value: fallbackTheme.aloe,
              role: "Support",
              usage: "Quiet supporting fields",
              contrast: "pass",
            },
            {
              name: "Clay",
              value: fallbackTheme.clay,
              role: "Accent",
              usage: "Short emphasis",
              contrast: "warning",
            },
            {
              name: "Paper",
              value: fallbackTheme.paper,
              role: "Surface",
              usage: "Primary background",
              contrast: "pass",
            },
          ],
        },
      },
      {
        id: "typography",
        name: "Typography",
        state: "ready",
        frame: { x: 1180, y: 60, width: 520, height: 420 },
        summary:
          "Expressive editorial headlines with practical, open body copy.",
        rules: [
          "Use Newsreader for moments of invitation and point of view.",
          "Use Inter for navigation, data, and extended reading.",
          "Keep display lines short and let sentence case feel conversational.",
        ],
        content: {
          display: fallbackTypography.display,
          body: fallbackTypography.body,
          displayFallbacks: ["Georgia", "serif"],
          bodyFallbacks: ["Arial", "sans-serif"],
          displayWeights: [400, 600],
          bodyWeights: [400, 500, 600],
          scale: [
            { name: "Display", size: "72px", lineHeight: "68px", weight: 600 },
            { name: "Heading", size: "36px", lineHeight: "40px", weight: 600 },
            { name: "Body", size: "18px", lineHeight: "28px", weight: 400 },
          ],
          sampleHeadline: "A clearer way forward.",
          stylesheetUrl: fallbackTypography.stylesheetUrl,
        },
      },
      {
        id: "voice-and-tone",
        name: "Voice and Tone",
        state: "ready",
        frame: { x: 60, y: 520, width: 440, height: 480 },
        summary:
          "Steady guidance with enough optimism to create forward motion.",
        rules: [
          "Lead with the useful truth, then offer the next step.",
          "Sound composed, never clinical or overly polished.",
          "Prefer specific, active language over inflated claims.",
        ],
        content: {
          promise: "Make ambitious work feel lighter.",
          principles: [
            "Clear, not cold",
            "Optimistic, not loud",
            "Expert, not superior",
          ],
          preferredWords: ["Shape", "Together", "Forward", "Useful"],
          avoidedWords: ["Revolutionary", "Effortless", "Disrupt", "Magic"],
          headline: "A clearer way forward.",
          body: "Bring the moving parts together and make space for the work that matters.",
          callToAction: "Find your next step",
          beforeAfter: {
            before: "Transform everything effortlessly.",
            after: "Make the next step clear.",
          },
        },
      },
      {
        id: "photography",
        name: "Photography",
        state: "ready",
        frame: { x: 540, y: 520, width: 700, height: 480 },
        summary: "Observed moments where human craft meets warm natural light.",
        rules: [
          "Favor quiet, candid moments over staged collaboration.",
          "Let natural shadow and warm highlights carry the composition.",
          "Include tactile materials and signs of work in progress.",
        ],
        content: {
          direction: "Documentary warmth, tactile detail, patient composition.",
          photographs: [
            {
              role: "Hero",
              alt: "Sunlight crossing a quiet studio table",
              colors: ["#25352F", "#6F886F", "#E4BD70"],
            },
            {
              role: "Product",
              alt: "A crafted object in use",
              colors: ["#D0B49A", "#F1D89B", "#9C5B43"],
            },
            {
              role: "People",
              alt: "Two collaborators reviewing physical notes",
              colors: ["#402F2A", "#BC8066", "#E9D4AE"],
            },
            {
              role: "Texture",
              alt: "Layered paper and soft botanical shadow",
              colors: ["#E7D9BD", "#A7BDA7", "#31443D"],
            },
          ],
        },
      },
      {
        id: "motion",
        name: "Motion",
        state: "ready",
        frame: { x: 1280, y: 520, width: 420, height: 480 },
        summary: "Measured motion that settles gently and confirms progress.",
        rules: [
          "Movement begins decisively and arrives softly.",
          "Use one coordinated motion instead of several competing effects.",
          "Reduced motion replaces travel with a quiet opacity change.",
        ],
        content: {
          principle: "Lift, travel, settle",
          duration: fallbackMotion.duration,
          easing: fallbackMotion.easing,
        },
      },
      {
        id: "interface-foundation",
        name: "Interface Foundation",
        state: "ready",
        frame: { x: 60, y: 1040, width: 940, height: 330 },
        summary: "Calm, editorial surfaces with direct product controls.",
        rules: [
          "Reserve Saffron for the clearest next action.",
          "Use generous spacing and thin Ink rules to establish hierarchy.",
          "Corners stay modest so the system feels crafted, not playful.",
        ],
        content: {
          principle: "Editorial calm, product clarity",
          components: [
            "Buttons",
            "Inputs",
            "Cards",
            "Navigation",
            "Website example",
          ],
          example: {
            brandName: "Morrow",
            headline: "Build what matters.",
            callToAction: "Find your next step",
            cardTitle: "Project rhythm",
            cardDescription: "A calm weekly overview.",
            inputPlaceholder: "Search projects",
            actionLabel: "Create project",
          },
        },
      },
      {
        id: "design-tokens",
        name: "Design Tokens",
        state: "ready",
        frame: { x: 1040, y: 1040, width: 660, height: 330 },
        summary: "Production values that keep every application coherent.",
        rules: [
          "Tokens are the source of truth for every interface value.",
          "Use the spacing scale before introducing a new measurement.",
          "Motion values always inherit the reduced motion policy.",
        ],
        content: {
          css: `:root {\n  --color-ink: ${fallbackTheme.ink};\n  --color-saffron: ${fallbackTheme.saffron};\n  --font-display: ${fallbackTypography.display};\n  --radius-card: ${fallbackCardRadius};\n  --motion-standard: ${fallbackMotion.duration};\n}`,
          json: {
            "color.ink": fallbackTheme.ink,
            "color.saffron": fallbackTheme.saffron,
            "font.display": fallbackTypography.display,
            "radius.card": fallbackCardRadius,
            "motion.standard": fallbackMotion.duration,
          },
        },
      },
    ],
  });
}

export type ProgressiveGenerationData = {
  generationStage?:
    | "direction"
    | "logo"
    | "color"
    | "typography"
    | "voice-and-tone"
    | "ready"
    | "failed";
  generationError?: string;
  directionJson?: string;
  logoJson?: string;
  colorJson?: string;
  typographyJson?: string;
  voiceJson?: string;
};

function parseJson<Schema extends z.ZodType>(
  json: string | undefined,
  schema: Schema,
): z.infer<Schema> | null {
  if (!json) {
    return null;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function progressiveState(
  id: "logo" | "color" | "typography" | "voice-and-tone",
  stage: ProgressiveGenerationData["generationStage"],
  hasResult: boolean,
  hasError: boolean,
): BrandRegion["state"] {
  if (hasResult) {
    return "ready";
  }
  if (stage === id) {
    return hasError ? "failed" : "generating";
  }
  return "unfinished";
}

export function createProgressiveBrandSystem(
  projectName: string,
  generation: ProgressiveGenerationData,
) {
  if (!(generation.generationStage || generation.directionJson)) {
    return createFallbackBrandSystem(projectName);
  }

  const fallback = createFallbackBrandSystem(projectName);
  const direction = parseJson(generation.directionJson, brandDirectionSchema);
  const logo = parseJson(generation.logoJson, logoGenerationSchema);
  const color = parseJson(generation.colorJson, colorGenerationSchema);
  const typography = parseJson(
    generation.typographyJson,
    typographyGenerationSchema,
  );
  const voice = parseJson(generation.voiceJson, voiceGenerationSchema);

  const regions = fallback.regions.map((region): BrandRegion => {
    switch (region.id) {
      case "logo":
        return {
          ...region,
          state: progressiveState(
            "logo",
            generation.generationStage,
            !!logo,
            !!generation.generationError,
          ),
          ...(logo
            ? {
                summary: logo.summary,
                rules: logo.rules,
                content: {
                  wordmark: logo.wordmark,
                  monogram: logo.monogram,
                  tagline: logo.tagline,
                  variants: ["Primary lockup", "Wordmark", "Symbol"],
                  primaryLockupSvg: logo.primaryLockupSvg,
                  wordmarkSvg: logo.wordmarkSvg,
                  symbolSvg: logo.symbolSvg,
                },
              }
            : {}),
        };
      case "color":
        return {
          ...region,
          state: progressiveState(
            "color",
            generation.generationStage,
            !!color,
            !!generation.generationError,
          ),
          ...(color
            ? {
                summary: color.summary,
                rules: color.rules,
                content: { palette: color.palette },
              }
            : {}),
        };
      case "typography":
        return {
          ...region,
          state: progressiveState(
            "typography",
            generation.generationStage,
            !!typography,
            !!generation.generationError,
          ),
          ...(typography
            ? {
                summary: typography.summary,
                rules: typography.rules,
                content: typography,
              }
            : {}),
        };
      case "voice-and-tone":
        return {
          ...region,
          state: progressiveState(
            "voice-and-tone",
            generation.generationStage,
            !!voice,
            !!generation.generationError,
          ),
          ...(voice
            ? { summary: voice.summary, rules: voice.rules, content: voice }
            : {}),
        };
      default:
        return region;
    }
  }) as BrandSystem["regions"];

  const generatedTheme = color
    ? {
        ...fallback.theme,
        ink: color.palette[0]?.value ?? fallback.theme.ink,
        saffron: color.palette[1]?.value ?? fallback.theme.saffron,
        aloe: color.palette[2]?.value ?? fallback.theme.aloe,
        clay: color.palette[3]?.value ?? fallback.theme.clay,
        paper: color.palette[4]?.value ?? fallback.theme.paper,
      }
    : fallback.theme;

  return brandSystemSchema.parse({
    ...fallback,
    direction: direction ?? fallback.direction,
    theme: generatedTheme,
    regions,
  });
}

export function getValidatedDirectionName(directionJson?: string) {
  return parseJson(directionJson, brandDirectionSchema)?.name ?? null;
}
