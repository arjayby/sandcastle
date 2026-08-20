import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  brandDirectionSchema,
  colorGenerationSchema,
  logoGenerationSchema,
  type ProgressiveRegionId,
  typographyGenerationSchema,
  voiceGenerationSchema,
} from "./brandGenerationContract";
import { getBrandGenerationProvider } from "./brandGenerationProviders";

const stageValidator = v.union(
  v.literal("direction"),
  v.literal("logo"),
  v.literal("color"),
  v.literal("typography"),
  v.literal("voice-and-tone"),
  v.literal("ready"),
  v.literal("failed"),
);

const regionValidator = v.union(
  v.literal("logo"),
  v.literal("color"),
  v.literal("typography"),
  v.literal("voice-and-tone"),
);

const generationContextValidator = v.object({
  projectId: v.id("brandProjects"),
  ownerId: v.string(),
  companyName: v.string(),
  description: v.string(),
});

function schemaForRegion(region: ProgressiveRegionId) {
  switch (region) {
    case "logo":
      return logoGenerationSchema;
    case "color":
      return colorGenerationSchema;
    case "typography":
      return typographyGenerationSchema;
    case "voice-and-tone":
      return voiceGenerationSchema;
  }
}

export const getGenerationContext = internalQuery({
  args: { projectId: v.id("brandProjects"), ownerId: v.string() },
  returns: v.union(generationContextValidator, v.null()),
  handler: async (ctx, { projectId, ownerId }) => {
    const project = await ctx.db.get(projectId);
    if (!project || project.ownerId !== ownerId) {
      return null;
    }
    return {
      projectId,
      ownerId,
      companyName: project.companyName,
      description: project.description,
    };
  },
});

export const saveDirection = internalMutation({
  args: { projectId: v.id("brandProjects"), directionJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { projectId, directionJson }) => {
    brandDirectionSchema.parse(JSON.parse(directionJson));
    await ctx.db.patch(projectId, {
      directionJson,
      generationStage: "logo",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const saveRegion = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    region: regionValidator,
    resultJson: v.string(),
    nextStage: stageValidator,
  },
  returns: v.null(),
  handler: async (ctx, { projectId, region, resultJson, nextStage }) => {
    schemaForRegion(region).parse(JSON.parse(resultJson));
    const field = `${region === "voice-and-tone" ? "voice" : region}Json` as
      | "logoJson"
      | "colorJson"
      | "typographyJson"
      | "voiceJson";
    await ctx.db.patch(projectId, {
      [field]: resultJson,
      generationStage: nextStage,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: { projectId: v.id("brandProjects"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { projectId, error }) => {
    await ctx.db.patch(projectId, {
      generationError: error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const generate = internalAction({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, ownerId }) => {
    const context = await ctx.runQuery(
      internal.brandGeneration.getGenerationContext,
      { projectId, ownerId },
    );
    if (!context) {
      throw new ConvexError("Brand Project not found");
    }

    const provider = getBrandGenerationProvider();

    try {
      const direction = brandDirectionSchema.parse(
        await provider.createDirection(ctx, context),
      );
      await ctx.runMutation(internal.brandGeneration.saveDirection, {
        projectId,
        directionJson: JSON.stringify(direction),
      });

      const directedContext = { ...context, direction };
      const slices = [
        ["logo", "color", () => provider.createLogo(ctx, directedContext)],
        [
          "color",
          "typography",
          () => provider.createColor(ctx, directedContext),
        ],
        [
          "typography",
          "voice-and-tone",
          () => provider.createTypography(ctx, directedContext),
        ],
        [
          "voice-and-tone",
          "ready",
          () => provider.createVoice(ctx, directedContext),
        ],
      ] as const;

      for (const [region, nextStage, createResult] of slices) {
        const result = schemaForRegion(region).parse(await createResult());
        await ctx.runMutation(internal.brandGeneration.saveRegion, {
          projectId,
          region,
          resultJson: JSON.stringify(result),
          nextStage,
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.brandGeneration.markFailed, {
        projectId,
        error:
          error instanceof Error ? error.message : "Brand generation failed",
      });
    }

    return null;
  },
});
