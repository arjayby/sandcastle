import { ConvexError, v } from "convex/values";
import { z } from "zod";

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
import { runProviderRequest } from "./providerResponseContract";

const PROVIDER_TIMEOUT_MS = 120_000;

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
  generationStage: generationStageValidator,
  recoveryCount: v.number(),
  directionJson: v.optional(v.string()),
});

const photographGenerationContextValidator = v.object({
  projectId: v.id("brandProjects"),
  ownerId: v.string(),
  companyName: v.string(),
  description: v.string(),
  directionJson: v.string(),
  photographyDirectionJson: v.string(),
  recoveryCount: v.number(),
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
  motionJson: v.optional(v.string()),
  generationStage: generationStageValidator,
  recoveryCount: v.number(),
});

const imageProviderResponseSchema = z
  .object({
    data: z.instanceof(Uint8Array),
    mediaType: z.string().startsWith("image/"),
  })
  .refine(
    (image) => image.data.byteLength > 0 && image.data.byteLength <= 20_000_000,
    "Image provider returned an invalid photograph",
  );

async function requireProviderResult<Schema extends z.ZodType>(options: {
  request: (attempt: number) => Promise<unknown>;
  schema: Schema;
}) {
  const result = await runProviderRequest({
    ...options,
    timeoutMs: PROVIDER_TIMEOUT_MS,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

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
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    operationId: v.string(),
  },
  returns: v.union(generationContextValidator, v.null()),
  handler: async (ctx, { projectId, ownerId, operationId }) => {
    const project = await ctx.db.get(projectId);
    if (
      !project ||
      project.ownerId !== ownerId ||
      project.activeOperationId !== operationId ||
      project.activeOperationKind !== "generation" ||
      !project.generationStage
    ) {
      return null;
    }
    return {
      projectId,
      ownerId,
      companyName: project.companyName,
      description: project.description,
      generationStage: project.generationStage,
      recoveryCount: project.generationRecoveryCount ?? 0,
      directionJson: project.directionJson,
    };
  },
});

export const saveDirection = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    operationId: v.string(),
    directionJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, operationId, directionJson }) => {
    brandDirectionSchema.parse(JSON.parse(directionJson));
    const project = await ctx.db.get(projectId);
    if (project?.activeOperationId !== operationId) {
      throw new ConvexError("Brand generation operation is no longer active");
    }
    await ctx.db.patch(projectId, {
      directionJson,
      generationStage: "logo",
      generationError: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const saveRegion = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    operationId: v.string(),
    region: regionValidator,
    resultJson: v.string(),
    nextStage: generationStageValidator,
  },
  returns: v.null(),
  handler: async (
    ctx,
    { projectId, operationId, region, resultJson, nextStage },
  ) => {
    schemaForRegion(region).parse(JSON.parse(resultJson));
    const project = await ctx.db.get(projectId);
    if (project?.activeOperationId !== operationId) {
      throw new ConvexError("Brand generation operation is no longer active");
    }
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
      generationError: undefined,
      ...(nextStage === "ready"
        ? {
            activeOperationId: undefined,
            activeOperationKind: undefined,
          }
        : {}),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const startPhotography = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    operationId: v.string(),
    directionJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, ownerId, operationId, directionJson }) => {
    const direction = photographyDirectionSchema.parse(
      JSON.parse(directionJson),
    );
    const project = await ctx.db.get(projectId);
    if (
      !project ||
      project.ownerId !== ownerId ||
      project.activeOperationId !== operationId
    ) {
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
          { projectId, ownerId, role: shot.role, operationId },
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
    operationId: v.string(),
  },
  returns: v.union(photographGenerationContextValidator, v.null()),
  handler: async (ctx, { projectId, ownerId, role, operationId }) => {
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
      project.activeOperationId !== operationId ||
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
      recoveryCount: project.generationRecoveryCount ?? 0,
    };
  },
});

export const getAppliedGenerationContext = internalQuery({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    operationId: v.string(),
  },
  returns: v.union(appliedGenerationContextValidator, v.null()),
  handler: async (ctx, { projectId, ownerId, operationId }) => {
    const project = await ctx.db.get(projectId);
    if (
      !project ||
      project.ownerId !== ownerId ||
      project.activeOperationId !== operationId ||
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
      motionJson: project.motionJson,
      generationStage: project.generationStage ?? "motion",
      recoveryCount: project.generationRecoveryCount ?? 0,
    };
  },
});

async function finishPhotographyIfComplete(
  ctx: MutationCtx,
  projectId: Id<"brandProjects">,
  operationId: string,
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
    if (
      project?.generationStage !== "photography" ||
      project.activeOperationId !== operationId
    ) {
      return;
    }
    const failedPhotograph = photographs.find(
      (photograph) => photograph.state === "failed",
    );
    if (failedPhotograph) {
      await ctx.db.patch(projectId, {
        generationError:
          failedPhotograph.error ?? "Brand Photograph generation failed",
        activeOperationId: undefined,
        activeOperationKind: undefined,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.patch(projectId, {
      generationStage: "motion",
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.brandGeneration.generateAppliedRegions,
      { projectId, ownerId: project.ownerId, operationId },
    );
  }
}

export const savePhotograph = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    operationId: v.string(),
    role: photographRoleValidator,
    storageId: v.id("_storage"),
    mediaType: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx,
    { projectId, operationId, role, storageId, mediaType },
  ) => {
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
    await finishPhotographyIfComplete(ctx, projectId, operationId);
    return null;
  },
});

export const failPhotograph = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    operationId: v.string(),
    role: photographRoleValidator,
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, operationId, role, error }) => {
    const photograph = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) =>
        q.eq("projectId", projectId).eq("role", role),
      )
      .unique();
    if (photograph) {
      await ctx.db.patch(photograph._id, { state: "failed", error });
      await finishPhotographyIfComplete(ctx, projectId, operationId);
    }
    return null;
  },
});

export const generatePhotograph = internalAction({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    role: photographRoleValidator,
    operationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, ownerId, role, operationId }) => {
    const context = await ctx.runQuery(
      internal.brandGeneration.getPhotographGenerationContext,
      { projectId, ownerId, role, operationId },
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
      const provider = getBrandImageProvider();
      const image = await requireProviderResult({
        request: (providerAttempt) =>
          provider.createPhotograph(
            {
              ...context,
              direction,
              providerAttempt,
              recoveryCount: context.recoveryCount,
            },
            photographyDirection,
            shot,
          ),
        schema: imageProviderResponseSchema,
      });
      const storedData = Uint8Array.from(image.data);
      storageId = await ctx.storage.store(
        new Blob([storedData.buffer], { type: image.mediaType }),
      );
      await ctx.runMutation(internal.brandGeneration.savePhotograph, {
        projectId,
        operationId,
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
        operationId,
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
  args: {
    projectId: v.id("brandProjects"),
    operationId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, operationId, error }) => {
    const project = await ctx.db.get(projectId);
    if (project?.activeOperationId !== operationId) {
      return null;
    }
    await ctx.db.patch(projectId, {
      generationError: error,
      activeOperationId: undefined,
      activeOperationKind: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const generateAppliedRegions = internalAction({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    operationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, ownerId, operationId }) => {
    const context = await ctx.runQuery(
      internal.brandGeneration.getAppliedGenerationContext,
      { projectId, ownerId, operationId },
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
        recoveryCount: context.recoveryCount,
      };
      const color = colorGenerationSchema.parse(JSON.parse(context.colorJson));
      const typography = typographyGenerationSchema.parse(
        JSON.parse(context.typographyJson),
      );
      const voice = voiceGenerationSchema.parse(JSON.parse(context.voiceJson));
      let stage = context.generationStage;
      let motion = context.motionJson
        ? motionGenerationSchema.parse(JSON.parse(context.motionJson))
        : null;
      if (stage === "motion") {
        motion = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createMotion(ctx, {
              ...directedContext,
              providerAttempt,
            }),
          schema: motionGenerationSchema,
        });
        await ctx.runMutation(internal.brandGeneration.saveRegion, {
          projectId,
          operationId,
          region: "motion",
          resultJson: JSON.stringify(motion),
          nextStage: "interface-foundation",
        });
        stage = "interface-foundation";
      }
      if (!motion) {
        throw new Error("Motion Brand Region is unavailable");
      }

      const appliedContext = {
        ...directedContext,
        color,
        typography,
        voice,
        motion,
      };
      if (stage === "interface-foundation") {
        const interfaceFoundation = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createInterface(ctx, {
              ...appliedContext,
              providerAttempt,
            }),
          schema: interfaceGenerationSchema,
        });
        await ctx.runMutation(internal.brandGeneration.saveRegion, {
          projectId,
          operationId,
          region: "interface-foundation",
          resultJson: JSON.stringify(interfaceFoundation),
          nextStage: "design-tokens",
        });
        stage = "design-tokens";
      }

      if (stage === "design-tokens") {
        const designTokens = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createDesignTokens(ctx, {
              ...appliedContext,
              providerAttempt,
            }),
          schema: designTokensGenerationSchema,
        });
        await ctx.runMutation(internal.brandGeneration.saveRegion, {
          projectId,
          operationId,
          region: "design-tokens",
          resultJson: JSON.stringify(designTokens),
          nextStage: "ready",
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.brandGeneration.markFailed, {
        projectId,
        operationId,
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
    operationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, ownerId, operationId }) => {
    const context = await ctx.runQuery(
      internal.brandGeneration.getGenerationContext,
      { projectId, ownerId, operationId },
    );
    if (!context) {
      throw new ConvexError("Brand Project not found");
    }

    const provider = getBrandGenerationProvider();

    try {
      let stage = context.generationStage;
      let direction = context.directionJson
        ? brandDirectionSchema.parse(JSON.parse(context.directionJson))
        : null;
      if (stage === "direction") {
        direction = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createDirection(ctx, {
              ...context,
              providerAttempt,
            }),
          schema: brandDirectionSchema,
        });
        await ctx.runMutation(internal.brandGeneration.saveDirection, {
          projectId,
          operationId,
          directionJson: JSON.stringify(direction),
        });
        stage = "logo";
      }
      if (!direction) {
        throw new Error("Brand direction is unavailable");
      }

      const directedContext = {
        projectId,
        ownerId,
        companyName: context.companyName,
        description: context.description,
        direction,
        recoveryCount: context.recoveryCount,
      };
      const slices = [
        ["logo", "color", provider.createLogo],
        ["color", "typography", provider.createColor],
        ["typography", "voice-and-tone", provider.createTypography],
        ["voice-and-tone", "photography-direction", provider.createVoice],
      ] as const;

      const startIndex = slices.findIndex(([region]) => region === stage);
      if (startIndex >= 0) {
        for (const [region, nextStage, createResult] of slices.slice(
          startIndex,
        )) {
          const result = await requireProviderResult({
            request: (providerAttempt) =>
              createResult(ctx, { ...directedContext, providerAttempt }),
            schema: schemaForRegion(region),
          });
          await ctx.runMutation(internal.brandGeneration.saveRegion, {
            projectId,
            operationId,
            region,
            resultJson: JSON.stringify(result),
            nextStage,
          });
          stage = nextStage;
        }
      }

      if (stage !== "photography-direction") {
        return null;
      }
      const photographyDirection = await requireProviderResult({
        request: (providerAttempt) =>
          provider.createPhotographyDirection(ctx, {
            ...directedContext,
            providerAttempt,
          }),
        schema: photographyDirectionSchema,
      });
      await ctx.runMutation(internal.brandGeneration.startPhotography, {
        projectId,
        ownerId,
        operationId,
        directionJson: JSON.stringify(photographyDirection),
      });
    } catch (error) {
      await ctx.runMutation(internal.brandGeneration.markFailed, {
        projectId,
        operationId,
        error:
          error instanceof Error ? error.message : "Brand generation failed",
      });
    }

    return null;
  },
});
