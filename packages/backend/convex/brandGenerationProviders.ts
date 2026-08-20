import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { brandAgent } from "./agent";
import {
  type BrandDirection,
  brandDirectionSchema,
  type ColorGeneration,
  colorGenerationSchema,
  type DesignTokensGeneration,
  designTokensGenerationSchema,
  type InterfaceGeneration,
  interfaceGenerationSchema,
  type LogoGeneration,
  logoGenerationSchema,
  type MotionGeneration,
  motionGenerationSchema,
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

export type AppliedGenerationContext = DirectedGenerationContext & {
  color: ColorGeneration;
  typography: TypographyGeneration;
  voice: VoiceGeneration;
  motion: MotionGeneration;
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
  createMotion: (
    ctx: ActionCtx,
    context: DirectedGenerationContext,
  ) => Promise<MotionGeneration>;
  createInterface: (
    ctx: ActionCtx,
    context: AppliedGenerationContext,
  ) => Promise<InterfaceGeneration>;
  createDesignTokens: (
    ctx: ActionCtx,
    context: AppliedGenerationContext,
  ) => Promise<DesignTokensGeneration>;
};

function typeScaleTokenName(name: string, index: number) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `step-${index + 1}`
  );
}

function enforceTokenDependencies(
  context: AppliedGenerationContext,
  candidate: unknown,
) {
  const generated = designTokensGenerationSchema.parse(candidate);
  const [ink, primary, support, accent, surface] = context.color.palette;

  return designTokensGenerationSchema.parse({
    ...generated,
    colors: {
      ink: ink?.value,
      primary: primary?.value,
      support: support?.value,
      accent: accent?.value,
      surface: surface?.value,
    },
    fonts: {
      display: `"${context.typography.display}", ${context.typography.displayFallbacks.join(", ")}`,
      body: `"${context.typography.body}", ${context.typography.bodyFallbacks.join(", ")}`,
    },
    typeScale: Object.fromEntries(
      context.typography.scale.map((step, index) => [
        typeScaleTokenName(step.name, index),
        step.size,
      ]),
    ),
    motion: {
      duration: context.motion.duration,
      easing: context.motion.easing,
    },
  });
}

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
  async createMotion() {
    await controlledPause();
    return motionGenerationSchema.parse({
      summary: "Measured motion that settles gently and confirms progress.",
      rules: [
        "Movement begins decisively and arrives softly.",
        "Use one coordinated expression instead of competing effects.",
        "Reduced motion replaces travel with a static resting state.",
      ],
      principle: "Lift, travel, settle",
      duration: "320ms",
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  },
  async createInterface(_ctx, context) {
    await controlledPause();
    return interfaceGenerationSchema.parse({
      summary: "Calm editorial surfaces with direct product controls.",
      rules: [
        "Reserve Signal Gold for the clearest next action.",
        "Use generous spacing and fine Harbor Ink rules for hierarchy.",
        "Apply the generated type, corner, shadow, and motion tokens.",
      ],
      principle: "Editorial calm, product clarity",
      components: ["Buttons", "Inputs", "Cards", "Navigation", "Website"],
      example: {
        brandName: context.companyName,
        headline: context.voice.headline,
        body: context.voice.body,
        callToAction: context.voice.callToAction,
        secondaryAction: "See the approach",
        cardTitle: "Project rhythm",
        cardDescription: "A calm weekly overview for the work ahead.",
        inputLabel: "Email address",
        inputPlaceholder: "you@example.com",
        navigation: ["Approach", "Work", "About"],
      },
    });
  },
  async createDesignTokens(_ctx, context) {
    await controlledPause();
    return enforceTokenDependencies(context, {
      summary: "Production values that keep every application coherent.",
      rules: [
        "Treat tokens as the source of truth for interface values.",
        "Use the spacing scale before introducing a new measurement.",
        "Motion values inherit the reduced motion policy.",
      ],
      colors: {
        ink: "#17231F",
        primary: "#EDB33F",
        support: "#B7CEB7",
        accent: "#D57658",
        surface: "#F4EFE5",
      },
      fonts: { display: "Generated display", body: "Generated body" },
      typeScale: { generated: "16px" },
      spacing: { small: "8px", medium: "16px", large: "32px" },
      radius: { control: "8px", card: "12px" },
      shadows: { card: "0 18px 50px rgba(23, 35, 31, 0.12)" },
      motion: { duration: "1ms", easing: "cubic-bezier(0, 0, 1, 1)" },
    });
  },
};

async function controlledPause() {
  await new Promise((resolve) => setTimeout(resolve, 700));
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
  async createMotion(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      {
        schema: motionGenerationSchema,
        prompt: `${regionPrompt("motion", context)} Return one live motion principle with a practical CSS duration and cubic-bezier easing for product interfaces.`,
      },
    );
    return motionGenerationSchema.parse(result.object);
  },
  async createInterface(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      {
        schema: interfaceGenerationSchema,
        prompt: `${regionPrompt("interface foundation", context)} Create branded buttons, inputs, cards, navigation, and a small website example. Apply these generated dependencies: ${JSON.stringify({ color: context.color, typography: context.typography, voice: context.voice, motion: context.motion })}`,
      },
    );
    return interfaceGenerationSchema.parse(result.object);
  },
  async createDesignTokens(ctx, context) {
    const result = await brandAgent.generateObject(
      ctx,
      { userId: context.ownerId },
      {
        schema: designTokensGenerationSchema,
        prompt: `${regionPrompt("design tokens", context)} Create production usable token values for colors, fonts, type scale, spacing, corner radius, shadows, and motion. Token names must be lowercase kebab case. Preserve these generated dependencies exactly where applicable: ${JSON.stringify({ color: context.color, typography: context.typography, motion: context.motion })}`,
      },
    );
    return enforceTokenDependencies(context, result.object);
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
