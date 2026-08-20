import { google } from "@ai-sdk/google";
import { generateImage } from "ai";

import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { brandAgent } from "./agent";
import {
  type BrandDirection,
  brandDirectionSchema,
  type ColorGeneration,
  colorGenerationSchema,
  createPhotographPrompt,
  type LogoGeneration,
  logoGenerationSchema,
  type PhotographRole,
  type PhotographShot,
  type PhotographyDirection,
  photographyDirectionSchema,
  type TypographyGeneration,
  typographyGenerationSchema,
  type VoiceGeneration,
  validateTypographyWithGoogleFonts,
  voiceGenerationSchema,
} from "./brandGenerationContract";

export type GenerationContext = {
  projectId: Id<"brandProjects">;
  ownerId: string;
  companyName: string;
  description: string;
};

export type DirectedGenerationContext = GenerationContext & {
  direction: BrandDirection;
};

export type BrandGenerationProvider = {
  createDirection: (
    ctx: ActionCtx,
    context: GenerationContext,
  ) => Promise<BrandDirection>;
  createLogo: (
    ctx: ActionCtx,
    context: DirectedGenerationContext,
  ) => Promise<LogoGeneration>;
  createColor: (
    ctx: ActionCtx,
    context: DirectedGenerationContext,
  ) => Promise<ColorGeneration>;
  createTypography: (
    ctx: ActionCtx,
    context: DirectedGenerationContext,
  ) => Promise<TypographyGeneration>;
  createVoice: (
    ctx: ActionCtx,
    context: DirectedGenerationContext,
  ) => Promise<VoiceGeneration>;
  createPhotographyDirection: (
    ctx: ActionCtx,
    context: DirectedGenerationContext,
  ) => Promise<PhotographyDirection>;
};

export type BrandImageProvider = {
  createPhotograph: (
    context: DirectedGenerationContext,
    direction: PhotographyDirection,
    shot: PhotographShot,
  ) => Promise<{ data: Uint8Array; mediaType: string }>;
};

const controlledPrimaryLockupSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><title>Northstar signal mark</title><path fill="#17231F" d="M12 12h56v56H12zM88 24h136v12H88zM88 48h104v10H88z"/></svg>';
const controlledWordmarkSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><title>Northstar wordmark</title><path fill="#17231F" d="M12 26h216v12H12zM12 48h164v8H12z"/></svg>';
const controlledSymbolSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><title>Northstar symbol</title><path fill="#17231F" d="M40 5l10 25 25 10-25 10-10 25-10-25L5 40l25-10z"/></svg>';

const controlledProvider: BrandGenerationProvider = {
  async createDirection() {
    await controlledPause();
    return brandDirectionSchema.parse({
      name: "Northstar signal",
      concept:
        "A calm navigation system that turns independent planning into shared forward motion.",
      attributes: ["Clear", "Steady", "Resourceful"],
    });
  },
  async createLogo(_ctx, context) {
    await controlledPause();
    return logoGenerationSchema.parse({
      summary: "A single directional signal with a confident wordmark.",
      rules: [
        "Use the primary lockup in horizontal spaces.",
        "Keep one symbol width of clear space around every mark.",
        "Use the symbol alone only when the brand name is already present.",
      ],
      wordmark: context.companyName.toUpperCase(),
      monogram: context.companyName.slice(0, 1).toUpperCase(),
      tagline: "Plan with a clearer signal.",
      primaryLockupSvg: controlledPrimaryLockupSvg,
      wordmarkSvg: controlledWordmarkSvg,
      symbolSvg: controlledSymbolSvg,
    });
  },
  async createColor() {
    await controlledPause();
    return colorGenerationSchema.parse({
      summary: "Deep navigation ink with bright, purposeful signals.",
      rules: [
        "Use Signal Gold for the primary action.",
        "Use Harbor Ink for text and anchoring surfaces.",
        "Reserve Coral for short emphasis and warnings.",
      ],
      palette: [
        {
          name: "Harbor Ink",
          value: "#17231F",
          role: "Foundation",
          usage: "Primary text and dark surfaces",
          contrast: "pass",
        },
        {
          name: "Signal Gold",
          value: "#EDB33F",
          role: "Primary",
          usage: "Primary actions and key markers",
          contrast: "pass",
        },
        {
          name: "Waypoint Aloe",
          value: "#B7CEB7",
          role: "Support",
          usage: "Quiet panels and progress states",
          contrast: "pass",
        },
        {
          name: "Beacon Coral",
          value: "#D57658",
          role: "Accent",
          usage: "Brief emphasis on light surfaces",
          contrast: "warning",
        },
        {
          name: "Chart Paper",
          value: "#F4EFE5",
          role: "Surface",
          usage: "Primary canvas surface",
          contrast: "pass",
        },
      ],
    });
  },
  async createTypography() {
    await controlledPause();
    return typographyGenerationSchema.parse({
      summary: "Editorial confidence paired with highly legible working text.",
      rules: [
        "Use Newsreader for directional headlines.",
        "Use Inter for product controls and extended reading.",
        "Keep display lines short and sentence cased.",
      ],
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
      sampleHeadline: "Find the clearest way forward.",
      stylesheetUrl:
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:wght@400;600&display=swap",
    });
  },
  async createVoice() {
    await controlledPause();
    return voiceGenerationSchema.parse({
      summary: "Clear guidance that respects the Brand Builder's judgment.",
      rules: [
        "Lead with the useful truth.",
        "Give one clear next step.",
        "Sound confident without making inflated claims.",
      ],
      promise: "Turn uncertain planning into shared forward motion.",
      principles: [
        "Clear, not clinical",
        "Steady, not slow",
        "Expert, not superior",
      ],
      preferredWords: ["Signal", "Shape", "Forward", "Together"],
      avoidedWords: ["Effortless", "Magic", "Disrupt", "Revolutionary"],
      headline: "Find the clearest way forward.",
      body: "Bring plans, decisions, and progress into one calm view your team can act on.",
      callToAction: "Set your direction",
      beforeAfter: {
        before: "Revolutionize your planning effortlessly.",
        after: "Give every plan a clear next step.",
      },
    });
  },
  async createPhotographyDirection() {
    await controlledPause();
    return photographyDirectionSchema.parse({
      summary: "Observed teamwork shaped by warm directional light.",
      aesthetic: "Documentary, tactile, composed, and quietly optimistic.",
      lighting: "Low winter sunlight with gentle natural shadow.",
      palette: ["Harbor ink", "Signal gold", "Warm paper"],
      rules: [
        "Favor candid moments over staged collaboration.",
        "Keep materials tactile and believable.",
        "Leave enough visual quiet for the subject to breathe.",
      ],
      shots: [
        {
          role: "hero",
          subject: "A calm studio where a small team shapes a plan.",
          composition: "Wide environmental composition with open copy space.",
          alt: "A small team planning together in a sunlit studio",
        },
        {
          role: "product",
          subject: "A planning tool being used beside handwritten notes.",
          composition: "Close three quarter view with hands in frame.",
          alt: "A planning tool in use beside handwritten notes",
        },
        {
          role: "people",
          subject: "Two collaborators reviewing a shared decision.",
          composition: "Natural mid shot with unposed expressions.",
          alt: "Two collaborators reviewing a decision together",
        },
        {
          role: "texture",
          subject: "Layered paper, graphite, and botanical shadow.",
          composition: "Abstract overhead crop with generous negative space.",
          alt: "Layered paper and graphite under a botanical shadow",
        },
      ],
    });
  },
};

async function controlledPause(duration = 700) {
  await new Promise((resolve) => setTimeout(resolve, duration));
}

const liveProvider: BrandGenerationProvider = {
  async createDirection(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      {
        schema: brandDirectionSchema,
        prompt: `Create one internal brand direction before any visible Brand Region. Brand Brief: ${JSON.stringify({ companyName: context.companyName, description: context.description })}`,
      },
    );
    return brandDirectionSchema.parse(result.object);
  },
  async createLogo(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      { schema: logoGenerationSchema, prompt: regionPrompt("logo", context) },
    );
    return logoGenerationSchema.parse(result.object);
  },
  async createColor(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      { schema: colorGenerationSchema, prompt: regionPrompt("color", context) },
    );
    return colorGenerationSchema.parse(result.object);
  },
  async createTypography(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      {
        schema: typographyGenerationSchema,
        prompt: `${regionPrompt("typography", context)} Select display and body families from the full Google Fonts catalog and return a fonts.googleapis.com stylesheet URL that loads every selected weight.`,
      },
    );
    return await validateTypographyWithGoogleFonts(result.object);
  },
  async createVoice(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      {
        schema: voiceGenerationSchema,
        prompt: regionPrompt("voice and tone", context),
      },
    );
    return voiceGenerationSchema.parse(result.object);
  },
  async createPhotographyDirection(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      {
        schema: photographyDirectionSchema,
        prompt: `${regionPrompt("photography", context)} Create one shared photography direction with exactly one aligned shot plan for each of these roles: hero, product or service, people and culture, and texture or abstract. The direction must guide original image generation and avoid stock photography conventions, text, watermarks, and third party branding.`,
      },
    );
    return photographyDirectionSchema.parse(result.object);
  },
};

const controlledPhotographColors: Record<
  PhotographRole,
  [string, string, string]
> = {
  hero: ["#17231F", "#B7CEB7", "#EDB33F"],
  product: ["#D57658", "#F4EFE5", "#17231F"],
  people: ["#402F2A", "#BC8066", "#E9D4AE"],
  texture: ["#E7D9BD", "#A7BDA7", "#31443D"],
};

const controlledImageProvider: BrandImageProvider = {
  async createPhotograph(_context, _direction, shot) {
    const roleIndex = ["hero", "product", "people", "texture"].indexOf(
      shot.role,
    );
    await controlledPause(250 + roleIndex * 350);
    const colors = controlledPhotographColors[shot.role];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="${colors[0]}"/><circle cx="860" cy="240" r="310" fill="${colors[1]}"/><path d="M0 690L420 310l300 260 220-180 260 300v210H0z" fill="${colors[2]}"/></svg>`;
    return {
      data: new TextEncoder().encode(svg),
      mediaType: "image/svg+xml",
    };
  },
};

const liveImageProvider: BrandImageProvider = {
  async createPhotograph(context, direction, shot) {
    const { image } = await generateImage({
      model: google.image("imagen-4.0-generate-001"),
      prompt: createPhotographPrompt(
        {
          companyName: context.companyName,
          description: context.description,
        },
        direction,
        shot,
      ),
      aspectRatio: shot.role === "hero" ? "16:9" : "4:3",
    });
    return { data: image.uint8Array, mediaType: image.mediaType };
  },
};

function regionPrompt(region: string, context: DirectedGenerationContext) {
  return `Generate the ${region} Brand Region for this Brand Brief and direction. Keep one coherent identity. ${JSON.stringify({ companyName: context.companyName, description: context.description, direction: context.direction })}`;
}

export function getBrandGenerationProvider() {
  return process.env.BRAND_AGENT_PROVIDER === "controlled"
    ? controlledProvider
    : liveProvider;
}

export function getBrandImageProvider() {
  return process.env.BRAND_AGENT_PROVIDER === "controlled"
    ? controlledImageProvider
    : liveImageProvider;
}
