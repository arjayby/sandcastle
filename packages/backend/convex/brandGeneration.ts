import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import {
  brandDirectionSchema,
  colorGenerationSchema,
  designTokensGenerationSchema,
  interfaceGenerationSchema,
  logoGenerationSchema,
  motionGenerationSchema,
  type ProgressiveRegionId,
  photographRoles,
  photographyDirectionSchema,
  typographyGenerationSchema,
  voiceGenerationSchema,
} from "./brandGenerationContract";
import {
  getBrandGenerationProvider,
  getBrandImageProvider,
} from "./brandGenerationProviders";
import {
  generationStageValidator,
  photographRoleValidator,
} from "./brandGenerationValidators";

const regionValidator = v.union(
  v.literal("logo"),
  v.literal("color"),
  v.literal("typography"),
  v.literal("voice-and-tone"),
  v.literal("motion"),
  v.literal("interface-foundation"),
  v.literal("design-tokens"),
);

const generationContextValidator = v.object({
  projectId: v.id("brandProjects"),
  ownerId: v.string(),
  companyName: v.string(),
  description: v.string(),
});

const photographGenerationContextValidator = v.object({
  projectId: v.id("brandProjects"),
  ownerId: v.string(),
  companyName: v.string(),
  description: v.string(),
  directionJson: v.string(),
  photographyDirectionJson: v.string(),
});

const appliedGenerationContextValidator = v.object({
  projectId: v.id("brandProjects"),
  ownerId: v.string(),
  companyName: v.string(),
  description: v.string(),
  directionJson: v.string(),
  colorJson: v.string(),
  typographyJson: v.string(),
  voiceJson: v.string(),
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
    case "motion":
      return motionGenerationSchema;
    case "interface-foundation":
      return interfaceGenerationSchema;
    case "design-tokens":
      return designTokensGenerationSchema;
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
    nextStage: generationStageValidator,
  },
  returns: v.null(),
  handler: async (ctx, { projectId, region, resultJson, nextStage }) => {
    schemaForRegion(region).parse(JSON.parse(resultJson));
    const field = `${
      region === "voice-and-tone"
        ? "voice"
        : region === "interface-foundation"
          ? "interface"
          : region === "design-tokens"
            ? "designTokens"
            : region
    }Json` as
      | "logoJson"
      | "colorJson"
      | "typographyJson"
      | "voiceJson"
      | "motionJson"
      | "interfaceJson"
      | "designTokensJson";
    await ctx.db.patch(projectId, {
      [field]: resultJson,
      generationStage: nextStage,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const startPhotography = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    directionJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, ownerId, directionJson }) => {
    const direction = photographyDirectionSchema.parse(
      JSON.parse(directionJson),
    );
    const project = await ctx.db.get(projectId);
    if (!project || project.ownerId !== ownerId) {
      throw new ConvexError("Brand Project not found");
    }

    for (const shot of direction.shots) {
      const existing = await ctx.db
        .query("brandPhotographs")
        .withIndex("by_project_and_role", (q) =>
          q.eq("projectId", projectId).eq("role", shot.role),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("brandPhotographs", {
          projectId,
          role: shot.role,
          state: "generating",
          alt: shot.alt,
        });
        await ctx.scheduler.runAfter(
          0,
          internal.brandGeneration.generatePhotograph,
          { projectId, ownerId, role: shot.role },
        );
      }
    }

    await ctx.db.patch(projectId, {
      photographyDirectionJson: directionJson,
      generationStage: "photography",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getPhotographGenerationContext = internalQuery({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    role: photographRoleValidator,
  },
  returns: v.union(photographGenerationContextValidator, v.null()),
  handler: async (ctx, { projectId, ownerId, role }) => {
    const project = await ctx.db.get(projectId);
    const record = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) =>
        q.eq("projectId", projectId).eq("role", role),
      )
      .unique();
    if (
      !project ||
      project.ownerId !== ownerId ||
      !project.directionJson ||
      !project.photographyDirectionJson ||
      !record ||
      record.state !== "generating"
    ) {
      return null;
    }
    return {
      projectId,
      ownerId,
      companyName: project.companyName,
      description: project.description,
      directionJson: project.directionJson,
      photographyDirectionJson: project.photographyDirectionJson,
    };
  },
});

export const getAppliedGenerationContext = internalQuery({
  args: { projectId: v.id("brandProjects"), ownerId: v.string() },
  returns: v.union(appliedGenerationContextValidator, v.null()),
  handler: async (ctx, { projectId, ownerId }) => {
    const project = await ctx.db.get(projectId);
    if (
      !project ||
      project.ownerId !== ownerId ||
      !project.directionJson ||
      !project.colorJson ||
      !project.typographyJson ||
      !project.voiceJson
    ) {
      return null;
    }
    return {
      projectId,
      ownerId,
      companyName: project.companyName,
      description: project.description,
      directionJson: project.directionJson,
      colorJson: project.colorJson,
      typographyJson: project.typographyJson,
      voiceJson: project.voiceJson,
    };
  },
});

async function finishPhotographyIfComplete(
  ctx: MutationCtx,
  projectId: Id<"brandProjects">,
) {
  const photographs = await ctx.db
    .query("brandPhotographs")
    .withIndex("by_project_and_role", (q) => q.eq("projectId", projectId))
    .take(photographRoles.length);
  if (
    photographs.length === photographRoles.length &&
    photographs.every((photograph) => photograph.state !== "generating")
  ) {
    const project = await ctx.db.get(projectId);
    if (project?.generationStage !== "photography") {
      return;
    }
    await ctx.db.patch(projectId, {
      generationStage: "motion",
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.brandGeneration.generateAppliedRegions,
      { projectId, ownerId: project.ownerId },
    );
  }
}

export const savePhotograph = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    role: photographRoleValidator,
    storageId: v.id("_storage"),
    mediaType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, role, storageId, mediaType }) => {
    const photograph = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) =>
        q.eq("projectId", projectId).eq("role", role),
      )
      .unique();
    if (!photograph) {
      throw new ConvexError("Brand Photograph not found");
    }
    await ctx.db.patch(photograph._id, {
      state: "ready",
      storageId,
      mediaType,
    });
    await finishPhotographyIfComplete(ctx, projectId);
    return null;
  },
});

export const failPhotograph = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    role: photographRoleValidator,
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, role, error }) => {
    const photograph = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) =>
        q.eq("projectId", projectId).eq("role", role),
      )
      .unique();
    if (photograph) {
      await ctx.db.patch(photograph._id, { state: "failed", error });
      await finishPhotographyIfComplete(ctx, projectId);
    }
    return null;
  },
});

export const generatePhotograph = internalAction({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    role: photographRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, { projectId, ownerId, role }) => {
    const context = await ctx.runQuery(
      internal.brandGeneration.getPhotographGenerationContext,
      { projectId, ownerId, role },
    );
    if (!context) {
      return null;
    }

    let storageId: Id<"_storage"> | null = null;
    try {
      const direction = brandDirectionSchema.parse(
        JSON.parse(context.directionJson),
      );
      const photographyDirection = photographyDirectionSchema.parse(
        JSON.parse(context.photographyDirectionJson),
      );
      const shot = photographyDirection.shots.find(
        (candidate) => candidate.role === role,
      );
      if (!shot) {
        throw new Error(`Photography direction is missing ${role}`);
      }
      const image = await getBrandImageProvider().createPhotograph(
        { ...context, direction },
        photographyDirection,
        shot,
      );
      if (
        !image.mediaType.startsWith("image/") ||
        image.data.byteLength === 0 ||
        image.data.byteLength > 20_000_000
      ) {
        throw new Error("Image provider returned an invalid photograph");
      }
      const storedData = Uint8Array.from(image.data);
      storageId = await ctx.storage.store(
        new Blob([storedData.buffer], { type: image.mediaType }),
      );
      await ctx.runMutation(internal.brandGeneration.savePhotograph, {
        projectId,
        role,
        storageId,
        mediaType: image.mediaType,
      });
    } catch (error) {
      if (storageId) {
        await ctx.storage.delete(storageId);
      }
      await ctx.runMutation(internal.brandGeneration.failPhotograph, {
        projectId,
        role,
        error:
          error instanceof Error
            ? error.message
            : "Brand Photograph generation failed",
      });
    }

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

export const generateAppliedRegions = internalAction({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, ownerId }) => {
    const context = await ctx.runQuery(
      internal.brandGeneration.getAppliedGenerationContext,
      { projectId, ownerId },
    );
    if (!context) {
      throw new ConvexError("Brand Project not found");
    }

    const provider = getBrandGenerationProvider();

    try {
      const directedContext = {
        projectId,
        ownerId,
        companyName: context.companyName,
        description: context.description,
        direction: brandDirectionSchema.parse(
          JSON.parse(context.directionJson),
        ),
      };
      const color = colorGenerationSchema.parse(JSON.parse(context.colorJson));
      const typography = typographyGenerationSchema.parse(
        JSON.parse(context.typographyJson),
      );
      const voice = voiceGenerationSchema.parse(JSON.parse(context.voiceJson));
      const motion = motionGenerationSchema.parse(
        await provider.createMotion(ctx, directedContext),
      );
      await ctx.runMutation(internal.brandGeneration.saveRegion, {
        projectId,
        region: "motion",
        resultJson: JSON.stringify(motion),
        nextStage: "interface-foundation",
      });

      const appliedContext = {
        ...directedContext,
        color,
        typography,
        voice,
        motion,
      };
      const interfaceFoundation = interfaceGenerationSchema.parse(
        await provider.createInterface(ctx, appliedContext),
      );
      await ctx.runMutation(internal.brandGeneration.saveRegion, {
        projectId,
        region: "interface-foundation",
        resultJson: JSON.stringify(interfaceFoundation),
        nextStage: "design-tokens",
      });

      const designTokens = designTokensGenerationSchema.parse(
        await provider.createDesignTokens(ctx, appliedContext),
      );
      await ctx.runMutation(internal.brandGeneration.saveRegion, {
        projectId,
        region: "design-tokens",
        resultJson: JSON.stringify(designTokens),
        nextStage: "ready",
      });
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
          "photography-direction",
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

      const photographyDirection = photographyDirectionSchema.parse(
        await provider.createPhotographyDirection(ctx, directedContext),
      );
      await ctx.runMutation(internal.brandGeneration.startPhotography, {
        projectId,
        ownerId,
        directionJson: JSON.stringify(photographyDirection),
      });
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
