import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  brandDirectionSchema,
  colorGenerationSchema,
  designTokensGenerationSchema,
  interfaceGenerationSchema,
  logoGenerationSchema,
  motionGenerationSchema,
  photographRoles,
  photographyDirectionSchema,
  typographyGenerationSchema,
  voiceGenerationSchema,
} from "./brandGenerationContract";
import {
  enforceTokenDependencies,
  getBrandGenerationProvider,
  getBrandImageProvider,
} from "./brandGenerationProviders";
import {
  brandRegionIdValidator,
  photographRoleValidator,
} from "./brandGenerationValidators";
import {
  getSemanticRevisionRegions,
  shouldCreateBrandPhotographs,
} from "./brandRevisionContract";
import { runProviderRequest } from "./providerResponseContract";

const PROVIDER_TIMEOUT_MS = 120_000;

const revisionPhotographValidator = v.object({
  role: photographRoleValidator,
  alt: v.string(),
  storageId: v.id("_storage"),
  mediaType: v.string(),
});

const revisionContextValidator = v.object({
  projectId: v.id("brandProjects"),
  ownerId: v.string(),
  companyName: v.string(),
  description: v.string(),
  directionJson: v.string(),
  logoJson: v.string(),
  colorJson: v.string(),
  typographyJson: v.string(),
  voiceJson: v.string(),
  photographyDirectionJson: v.string(),
  motionJson: v.string(),
  interfaceJson: v.string(),
  designTokensJson: v.string(),
  recoveryCount: v.number(),
  photographs: v.array(
    v.object({
      role: photographRoleValidator,
      alt: v.string(),
      storageId: v.id("_storage"),
      mediaType: v.string(),
    }),
  ),
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

export const getRevisionContext = internalQuery({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    operationId: v.string(),
  },
  returns: v.union(revisionContextValidator, v.null()),
  handler: async (ctx, { projectId, ownerId, operationId }) => {
    const project = await ctx.db.get(projectId);
    if (
      !project ||
      project.ownerId !== ownerId ||
      project.activeOperationId !== operationId ||
      project.activeOperationKind !== "revision" ||
      !project.directionJson ||
      !project.logoJson ||
      !project.colorJson ||
      !project.typographyJson ||
      !project.voiceJson ||
      !project.photographyDirectionJson ||
      !project.motionJson ||
      !project.interfaceJson ||
      !project.designTokensJson
    ) {
      return null;
    }
    const photographs = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) => q.eq("projectId", projectId))
      .take(photographRoles.length);
    if (
      photographs.length !== photographRoles.length ||
      photographs.some(
        (photograph) =>
          photograph.state !== "ready" ||
          !photograph.storageId ||
          !photograph.mediaType,
      )
    ) {
      return null;
    }
    return {
      projectId,
      ownerId,
      companyName: project.companyName,
      description: project.description,
      directionJson: project.directionJson,
      logoJson: project.logoJson,
      colorJson: project.colorJson,
      typographyJson: project.typographyJson,
      voiceJson: project.voiceJson,
      photographyDirectionJson: project.photographyDirectionJson,
      motionJson: project.motionJson,
      interfaceJson: project.interfaceJson,
      designTokensJson: project.designTokensJson,
      recoveryCount: project.generationRecoveryCount ?? 0,
      photographs: photographs.map((photograph) => ({
        role: photograph.role,
        alt: photograph.alt,
        storageId: photograph.storageId as Id<"_storage">,
        mediaType: photograph.mediaType as string,
      })),
    };
  },
});

export const applyRevision = internalMutation({
  args: {
    projectId: v.id("brandProjects"),
    operationId: v.string(),
    directionJson: v.optional(v.string()),
    logoJson: v.optional(v.string()),
    colorJson: v.optional(v.string()),
    typographyJson: v.optional(v.string()),
    voiceJson: v.optional(v.string()),
    photographyDirectionJson: v.optional(v.string()),
    motionJson: v.optional(v.string()),
    interfaceJson: v.optional(v.string()),
    designTokensJson: v.optional(v.string()),
    photographs: v.optional(v.array(revisionPhotographValidator)),
  },
  returns: v.array(v.id("_storage")),
  handler: async (ctx, args) => {
    const serializedResults = [
      [args.directionJson, brandDirectionSchema],
      [args.logoJson, logoGenerationSchema],
      [args.colorJson, colorGenerationSchema],
      [args.typographyJson, typographyGenerationSchema],
      [args.voiceJson, voiceGenerationSchema],
      [args.photographyDirectionJson, photographyDirectionSchema],
      [args.motionJson, motionGenerationSchema],
      [args.interfaceJson, interfaceGenerationSchema],
      [args.designTokensJson, designTokensGenerationSchema],
    ] as const;
    for (const [serializedResult, schema] of serializedResults) {
      if (serializedResult) {
        schema.parse(JSON.parse(serializedResult));
      }
    }
    if (
      args.photographs &&
      (args.photographs.length !== photographRoles.length ||
        photographRoles.some(
          (role) =>
            args.photographs?.filter((photograph) => photograph.role === role)
              .length !== 1,
        ))
    ) {
      throw new ConvexError(
        "A revised photograph is required for every photography role",
      );
    }
    const project = await ctx.db.get(args.projectId);
    if (
      project?.activeOperationId !== args.operationId ||
      project.activeOperationKind !== "revision"
    ) {
      throw new ConvexError("Semantic Revision operation is no longer active");
    }

    const oldStorageIds: Id<"_storage">[] = [];
    if (args.photographs) {
      for (const photograph of args.photographs) {
        const existing = await ctx.db
          .query("brandPhotographs")
          .withIndex("by_project_and_role", (q) =>
            q.eq("projectId", args.projectId).eq("role", photograph.role),
          )
          .unique();
        if (existing?.storageId) {
          oldStorageIds.push(existing.storageId);
        }
        if (existing) {
          await ctx.db.patch(existing._id, {
            state: "ready",
            alt: photograph.alt,
            storageId: photograph.storageId,
            mediaType: photograph.mediaType,
            error: undefined,
          });
        } else {
          await ctx.db.insert("brandPhotographs", {
            projectId: args.projectId,
            role: photograph.role,
            state: "ready",
            alt: photograph.alt,
            storageId: photograph.storageId,
            mediaType: photograph.mediaType,
          });
        }
      }
    }

    const {
      projectId: _,
      operationId: __,
      photographs: ___,
      ...updates
    } = args;
    void [_, __, ___];
    await ctx.db.patch(args.projectId, {
      ...updates,
      activeOperationId: undefined,
      activeOperationKind: undefined,
      revisingRegionIds: undefined,
      revisionError: undefined,
      updatedAt: Date.now(),
    });

    const unreferencedStorageIds: Id<"_storage">[] = [];
    for (const storageId of oldStorageIds) {
      const reference = await ctx.db
        .query("brandPhotographs")
        .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
        .first();
      if (!reference) {
        unreferencedStorageIds.push(storageId);
      }
    }
    return unreferencedStorageIds;
  },
});

export const markRevisionFailed = internalMutation({
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
      activeOperationId: undefined,
      activeOperationKind: undefined,
      revisingRegionIds: undefined,
      revisionError: error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const revise = internalAction({
  args: {
    projectId: v.id("brandProjects"),
    ownerId: v.string(),
    operationId: v.string(),
    request: v.string(),
    target: v.union(brandRegionIdValidator, v.null()),
  },
  returns: v.null(),
  handler: async (
    ctx,
    { projectId, ownerId, operationId, request, target },
  ) => {
    const context = await ctx.runQuery(
      internal.brandRevision.getRevisionContext,
      { projectId, ownerId, operationId },
    );
    if (!context) {
      await ctx.runMutation(internal.brandRevision.markRevisionFailed, {
        projectId,
        operationId,
        error: "Brand System is not ready for revision",
      });
      return null;
    }

    const newStorageIds: Id<"_storage">[] = [];
    let revisionApplied = false;
    try {
      const provider = getBrandGenerationProvider();
      const affected = new Set(getSemanticRevisionRegions(target, request));
      let direction = brandDirectionSchema.parse(
        JSON.parse(context.directionJson),
      );
      let logo = logoGenerationSchema.parse(JSON.parse(context.logoJson));
      let color = colorGenerationSchema.parse(JSON.parse(context.colorJson));
      let typography = typographyGenerationSchema.parse(
        JSON.parse(context.typographyJson),
      );
      let voice = voiceGenerationSchema.parse(JSON.parse(context.voiceJson));
      let photographyDirection = photographyDirectionSchema.parse(
        JSON.parse(context.photographyDirectionJson),
      );
      let motion = motionGenerationSchema.parse(JSON.parse(context.motionJson));
      let interfaceFoundation = interfaceGenerationSchema.parse(
        JSON.parse(context.interfaceJson),
      );
      let designTokens = designTokensGenerationSchema.parse(
        JSON.parse(context.designTokensJson),
      );
      const baseContext = {
        projectId,
        ownerId,
        companyName: context.companyName,
        description: context.description,
        recoveryCount: context.recoveryCount,
      };
      const revisionContext = (currentRegion: unknown) => ({
        ...baseContext,
        direction,
        semanticRevision: { request, currentRegion },
      });

      if (target === null) {
        direction = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createDirection(ctx, {
              ...baseContext,
              providerAttempt,
              semanticRevision: { request, currentRegion: direction },
            }),
          schema: brandDirectionSchema,
        });
      }
      if (affected.has("logo")) {
        logo = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createLogo(ctx, {
              ...revisionContext(logo),
              providerAttempt,
            }),
          schema: logoGenerationSchema,
        });
      }
      if (affected.has("color")) {
        color = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createColor(ctx, {
              ...revisionContext(color),
              providerAttempt,
            }),
          schema: colorGenerationSchema,
        });
      }
      if (affected.has("typography")) {
        typography = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createTypography(ctx, {
              ...revisionContext(typography),
              providerAttempt,
            }),
          schema: typographyGenerationSchema,
        });
      }
      if (affected.has("voice-and-tone")) {
        voice = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createVoice(ctx, {
              ...revisionContext(voice),
              providerAttempt,
            }),
          schema: voiceGenerationSchema,
        });
      }
      if (affected.has("photography")) {
        photographyDirection = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createPhotographyDirection(ctx, {
              ...revisionContext(photographyDirection),
              providerAttempt,
            }),
          schema: photographyDirectionSchema,
        });
      }
      if (affected.has("motion")) {
        motion = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createMotion(ctx, {
              ...revisionContext(motion),
              providerAttempt,
            }),
          schema: motionGenerationSchema,
        });
      }
      const appliedContext = {
        ...baseContext,
        direction,
        color,
        typography,
        voice,
        motion,
      };
      if (affected.has("interface-foundation")) {
        interfaceFoundation = await requireProviderResult({
          request: (providerAttempt) =>
            provider.createInterface(ctx, {
              ...appliedContext,
              providerAttempt,
              semanticRevision: {
                request,
                currentRegion: interfaceFoundation,
              },
            }),
          schema: interfaceGenerationSchema,
        });
      }
      if (affected.has("design-tokens")) {
        designTokens = enforceTokenDependencies(
          appliedContext,
          await requireProviderResult({
            request: (providerAttempt) =>
              provider.createDesignTokens(ctx, {
                ...appliedContext,
                providerAttempt,
                semanticRevision: { request, currentRegion: designTokens },
              }),
            schema: designTokensGenerationSchema,
          }),
        );
      }

      let revisedPhotographs:
        | Array<{
            role: (typeof photographRoles)[number];
            alt: string;
            storageId: Id<"_storage">;
            mediaType: string;
          }>
        | undefined;
      if (shouldCreateBrandPhotographs(target, request)) {
        const imageProvider = getBrandImageProvider();
        const generatedImages = await Promise.all(
          photographyDirection.shots.map(async (shot) => ({
            shot,
            image: await requireProviderResult({
              request: (providerAttempt) =>
                imageProvider.createPhotograph(
                  {
                    ...revisionContext(photographyDirection),
                    providerAttempt,
                  },
                  photographyDirection,
                  shot,
                ),
              schema: imageProviderResponseSchema,
            }),
          })),
        );
        revisedPhotographs = [];
        for (const { shot, image } of generatedImages) {
          const storedData = Uint8Array.from(image.data);
          const storageId = await ctx.storage.store(
            new Blob([storedData.buffer], { type: image.mediaType }),
          );
          newStorageIds.push(storageId);
          revisedPhotographs.push({
            role: shot.role,
            alt: shot.alt,
            storageId,
            mediaType: image.mediaType,
          });
        }
      }

      const oldStorageIds = await ctx.runMutation(
        internal.brandRevision.applyRevision,
        {
          projectId,
          operationId,
          ...(target === null
            ? { directionJson: JSON.stringify(direction) }
            : {}),
          ...(affected.has("logo") ? { logoJson: JSON.stringify(logo) } : {}),
          ...(affected.has("color")
            ? { colorJson: JSON.stringify(color) }
            : {}),
          ...(affected.has("typography")
            ? { typographyJson: JSON.stringify(typography) }
            : {}),
          ...(affected.has("voice-and-tone")
            ? { voiceJson: JSON.stringify(voice) }
            : {}),
          ...(affected.has("photography")
            ? {
                photographyDirectionJson: JSON.stringify(photographyDirection),
              }
            : {}),
          ...(affected.has("motion")
            ? { motionJson: JSON.stringify(motion) }
            : {}),
          ...(affected.has("interface-foundation")
            ? { interfaceJson: JSON.stringify(interfaceFoundation) }
            : {}),
          ...(affected.has("design-tokens")
            ? { designTokensJson: JSON.stringify(designTokens) }
            : {}),
          photographs: revisedPhotographs,
        },
      );
      revisionApplied = true;
      for (const storageId of oldStorageIds) {
        try {
          await ctx.storage.delete(storageId);
        } catch {
          // The applied revision remains valid if obsolete storage cleanup fails.
        }
      }
    } catch (error) {
      if (revisionApplied) {
        return null;
      }
      for (const storageId of newStorageIds) {
        try {
          await ctx.storage.delete(storageId);
        } catch {
          // Continue so the operation lock is always released.
        }
      }
      await ctx.runMutation(internal.brandRevision.markRevisionFailed, {
        projectId,
        operationId,
        error:
          error instanceof Error ? error.message : "Semantic Revision failed",
      });
    }
    return null;
  },
});
