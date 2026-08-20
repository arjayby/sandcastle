import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";
import { photographRoles } from "./brandGenerationContract";
import {
  brandRegionIdValidator,
  generationStageValidator,
  operationKindValidator,
  photographRoleValidator,
} from "./brandGenerationValidators";
import { claimBrandProjectOperation } from "./brandOperationContract";
import { getSemanticRevisionRegions } from "./brandRevisionContract";

const appliedGenerationStages = new Set([
  "motion",
  "interface-foundation",
  "design-tokens",
]);

function generationActionForStage(stage: string | undefined) {
  return stage && appliedGenerationStages.has(stage)
    ? internal.brandGeneration.generateAppliedRegions
    : internal.brandGeneration.generate;
}

const brandProjectFields = {
  _id: v.id("brandProjects"),
  _creationTime: v.number(),
  ownerId: v.string(),
  draftId: v.string(),
  name: v.optional(v.string()),
  companyName: v.string(),
  description: v.string(),
  updatedAt: v.number(),
  generationStage: v.optional(generationStageValidator),
  generationError: v.optional(v.string()),
  activeOperationId: v.optional(v.string()),
  activeOperationKind: v.optional(operationKindValidator),
  revisingRegionIds: v.optional(v.array(brandRegionIdValidator)),
  revisionError: v.optional(v.string()),
  generationRecoveryCount: v.optional(v.number()),
  builtInFallback: v.optional(v.boolean()),
  directionJson: v.optional(v.string()),
  logoJson: v.optional(v.string()),
  colorJson: v.optional(v.string()),
  typographyJson: v.optional(v.string()),
  voiceJson: v.optional(v.string()),
  photographyDirectionJson: v.optional(v.string()),
  motionJson: v.optional(v.string()),
  interfaceJson: v.optional(v.string()),
  designTokensJson: v.optional(v.string()),
  reviewToken: v.optional(v.string()),
};

const brandProjectValidator = v.object(brandProjectFields);

const brandPhotographValidator = v.object({
  role: photographRoleValidator,
  state: v.union(
    v.literal("generating"),
    v.literal("ready"),
    v.literal("failed"),
  ),
  alt: v.string(),
  url: v.optional(v.string()),
});

async function getBrandPhotographs(
  ctx: QueryCtx,
  projectId: Id<"brandProjects">,
) {
  const records = await ctx.db
    .query("brandPhotographs")
    .withIndex("by_project_and_role", (q) => q.eq("projectId", projectId))
    .take(photographRoles.length);
  const byRole = new Map(records.map((record) => [record.role, record]));

  return await Promise.all(
    photographRoles.flatMap((role) => {
      const record = byRole.get(role);
      if (!record) {
        return [];
      }
      return [
        (async () => {
          const url = record.storageId
            ? await ctx.storage.getUrl(record.storageId)
            : null;
          return {
            role: record.role,
            state: record.state,
            alt: record.alt,
            ...(url ? { url } : {}),
          };
        })(),
      ];
    }),
  );
}

async function getOwnerId(
  ctx: Parameters<typeof authComponent.getAuthUser>[0],
) {
  const owner = await authComponent.getAuthUser(ctx);
  return owner._id;
}

function normalizeBrandBrief(companyName: string, description: string) {
  const normalizedBrandBrief = {
    companyName: companyName.trim(),
    description: description.trim(),
  };

  if (!normalizedBrandBrief.companyName || !normalizedBrandBrief.description) {
    throw new ConvexError("A company name and description are required");
  }

  return normalizedBrandBrief;
}

function normalizeProjectName(name: string) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new ConvexError("A Brand Project name is required");
  }

  return normalizedName;
}

async function getOwnedBrandProject(
  ctx: MutationCtx,
  ownerId: string,
  projectId: Id<"brandProjects">,
) {
  const project = await ctx.db.get(projectId);

  if (!project || project.ownerId !== ownerId) {
    throw new ConvexError("Brand Project not found");
  }

  return project;
}

function getCopyableBrandProjectData(project: Doc<"brandProjects">) {
  const {
    _id,
    _creationTime,
    ownerId,
    draftId,
    name,
    updatedAt,
    activeOperationId,
    activeOperationKind,
    revisingRegionIds,
    revisionError,
    reviewToken,
    ...copyableData
  } = project;
  void [
    _id,
    _creationTime,
    ownerId,
    draftId,
    name,
    updatedAt,
    activeOperationId,
    activeOperationKind,
    revisingRegionIds,
    revisionError,
    reviewToken,
  ];
  return copyableData;
}

export const create = mutation({
  args: {
    draftId: v.string(),
    companyName: v.string(),
    description: v.string(),
  },
  returns: v.id("brandProjects"),
  handler: async (ctx, args) => {
    const ownerId = await getOwnerId(ctx);
    const brandBrief = normalizeBrandBrief(args.companyName, args.description);

    const existingProject = await ctx.db
      .query("brandProjects")
      .withIndex("by_owner_and_draft", (q) =>
        q.eq("ownerId", ownerId).eq("draftId", args.draftId),
      )
      .unique();

    if (existingProject) {
      return existingProject._id;
    }

    const operation = claimBrandProjectOperation(
      null,
      "generation",
      crypto.randomUUID(),
    );
    const projectId = await ctx.db.insert("brandProjects", {
      ownerId,
      draftId: args.draftId,
      name: brandBrief.companyName,
      ...brandBrief,
      updatedAt: Date.now(),
      generationStage: "direction",
      activeOperationId: operation.id,
      activeOperationKind: operation.kind,
      generationRecoveryCount: 0,
    });

    await ctx.scheduler.runAfter(0, internal.brandGeneration.generate, {
      projectId,
      ownerId,
      operationId: operation.id,
    });

    return projectId;
  },
});

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(brandProjectValidator),
  handler: async (ctx, { paginationOpts }) => {
    const ownerId = await getOwnerId(ctx);
    return await ctx.db
      .query("brandProjects")
      .withIndex("by_owner_and_updated_at", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const get = query({
  args: { projectId: v.id("brandProjects") },
  returns: v.union(
    v.object({
      ...brandProjectFields,
      photographs: v.array(brandPhotographValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, { projectId }) => {
    const ownerId = await getOwnerId(ctx);
    const project = await ctx.db.get(projectId);
    if (!project || project.ownerId !== ownerId) {
      return null;
    }

    const photographs = await getBrandPhotographs(ctx, projectId);

    return { ...project, photographs };
  },
});

export const getForReview = query({
  args: { reviewToken: v.string() },
  returns: v.union(
    v.object({
      name: v.optional(v.string()),
      companyName: v.string(),
      description: v.string(),
      generationStage: v.optional(generationStageValidator),
      generationError: v.optional(v.string()),
      builtInFallback: v.optional(v.boolean()),
      directionJson: v.optional(v.string()),
      logoJson: v.optional(v.string()),
      colorJson: v.optional(v.string()),
      typographyJson: v.optional(v.string()),
      voiceJson: v.optional(v.string()),
      photographyDirectionJson: v.optional(v.string()),
      motionJson: v.optional(v.string()),
      interfaceJson: v.optional(v.string()),
      designTokensJson: v.optional(v.string()),
      photographs: v.array(brandPhotographValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, { reviewToken }) => {
    const project = await ctx.db
      .query("brandProjects")
      .withIndex("by_review_token", (q) => q.eq("reviewToken", reviewToken))
      .unique();
    if (!project) {
      return null;
    }

    const photographs = await getBrandPhotographs(ctx, project._id);

    return {
      name: project.name,
      companyName: project.companyName,
      description: project.description,
      generationStage: project.generationStage,
      generationError: project.generationError
        ? "A Brand Region could not be generated"
        : undefined,
      builtInFallback: project.builtInFallback,
      directionJson: project.directionJson,
      logoJson: project.logoJson,
      colorJson: project.colorJson,
      typographyJson: project.typographyJson,
      voiceJson: project.voiceJson,
      photographyDirectionJson: project.photographyDirectionJson,
      motionJson: project.motionJson,
      interfaceJson: project.interfaceJson,
      designTokensJson: project.designTokensJson,
      photographs,
    };
  },
});

export const createReviewLink = mutation({
  args: { projectId: v.id("brandProjects") },
  returns: v.string(),
  handler: async (ctx, { projectId }) => {
    const ownerId = await getOwnerId(ctx);
    const project = await getOwnedBrandProject(ctx, ownerId, projectId);
    if (project.reviewToken) {
      return project.reviewToken;
    }

    const reviewToken = crypto.randomUUID();
    await ctx.db.patch(projectId, { reviewToken });
    return reviewToken;
  },
});

export const revokeReviewLink = mutation({
  args: { projectId: v.id("brandProjects") },
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    const ownerId = await getOwnerId(ctx);
    await getOwnedBrandProject(ctx, ownerId, projectId);
    await ctx.db.patch(projectId, { reviewToken: undefined });
    return null;
  },
});

export const updateBrief = mutation({
  args: {
    projectId: v.id("brandProjects"),
    companyName: v.string(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, companyName, description }) => {
    const ownerId = await getOwnerId(ctx);
    await getOwnedBrandProject(ctx, ownerId, projectId);

    const brandBrief = normalizeBrandBrief(companyName, description);

    await ctx.db.patch(projectId, {
      ...brandBrief,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const rename = mutation({
  args: {
    projectId: v.id("brandProjects"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, name }) => {
    const ownerId = await getOwnerId(ctx);
    await getOwnedBrandProject(ctx, ownerId, projectId);

    await ctx.db.patch(projectId, {
      name: normalizeProjectName(name),
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const duplicate = mutation({
  args: { projectId: v.id("brandProjects") },
  returns: v.id("brandProjects"),
  handler: async (ctx, { projectId }) => {
    const ownerId = await getOwnerId(ctx);
    const project = await getOwnedBrandProject(ctx, ownerId, projectId);
    const copiedOperation =
      project.activeOperationId && project.activeOperationKind !== "revision"
        ? claimBrandProjectOperation(null, "generation", crypto.randomUUID())
        : null;

    const copiedProjectId = await ctx.db.insert("brandProjects", {
      ...getCopyableBrandProjectData(project),
      ownerId,
      draftId: crypto.randomUUID(),
      name: `${project.name ?? project.companyName} copy`,
      updatedAt: Date.now(),
      activeOperationId: copiedOperation?.id,
      activeOperationKind: copiedOperation?.kind,
    });
    const photographs = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) => q.eq("projectId", projectId))
      .take(photographRoles.length);
    await Promise.all(
      photographs.map(
        async ({ _id, _creationTime, projectId: _, ...photograph }) => {
          void [_id, _creationTime, _];
          await ctx.db.insert("brandPhotographs", {
            ...photograph,
            projectId: copiedProjectId,
          });
          if (photograph.state === "generating" && copiedOperation) {
            await ctx.scheduler.runAfter(
              0,
              internal.brandGeneration.generatePhotograph,
              {
                projectId: copiedProjectId,
                ownerId,
                role: photograph.role,
                operationId: copiedOperation.id,
              },
            );
          }
        },
      ),
    );
    if (copiedOperation && project.generationStage !== "photography") {
      await ctx.scheduler.runAfter(
        0,
        generationActionForStage(project.generationStage),
        {
          projectId: copiedProjectId,
          ownerId,
          operationId: copiedOperation.id,
        },
      );
    }

    return copiedProjectId;
  },
});

export const retryRegion = mutation({
  args: {
    projectId: v.id("brandProjects"),
    region: brandRegionIdValidator,
  },
  returns: v.null(),
  handler: async (ctx, { projectId, region }) => {
    const ownerId = await getOwnerId(ctx);
    const project = await getOwnedBrandProject(ctx, ownerId, projectId);
    const activeOperation = project.activeOperationId
      ? {
          id: project.activeOperationId,
          kind: project.activeOperationKind ?? ("generation" as const),
        }
      : null;
    if (!project.generationError || project.builtInFallback) {
      throw new ConvexError("This Brand Region is not waiting for recovery");
    }

    const stagesForRegion = {
      logo: ["logo"],
      color: ["color"],
      typography: ["typography"],
      "voice-and-tone": ["voice-and-tone"],
      photography: ["photography-direction", "photography"],
      motion: ["motion"],
      "interface-foundation": ["interface-foundation"],
      "design-tokens": ["design-tokens"],
    } as const;
    if (
      !project.generationStage ||
      !(stagesForRegion[region] as readonly string[]).includes(
        project.generationStage,
      )
    ) {
      throw new ConvexError("Only the failed Brand Region can be retried");
    }

    const operation = claimBrandProjectOperation(
      activeOperation,
      "generation",
      crypto.randomUUID(),
    );
    await ctx.db.patch(projectId, {
      activeOperationId: operation.id,
      activeOperationKind: operation.kind,
      generationError: undefined,
      generationRecoveryCount: (project.generationRecoveryCount ?? 0) + 1,
      updatedAt: Date.now(),
    });

    if (project.generationStage === "photography") {
      const photographs = await ctx.db
        .query("brandPhotographs")
        .withIndex("by_project_and_role", (q) => q.eq("projectId", projectId))
        .take(photographRoles.length);
      const failedPhotographs = photographs.filter(
        (photograph) => photograph.state === "failed",
      );
      if (failedPhotographs.length === 0) {
        throw new ConvexError("No failed Brand Photograph is available");
      }
      for (const photograph of failedPhotographs) {
        await ctx.db.patch(photograph._id, {
          state: "generating",
          error: undefined,
        });
        await ctx.scheduler.runAfter(
          0,
          internal.brandGeneration.generatePhotograph,
          {
            projectId,
            ownerId,
            role: photograph.role,
            operationId: operation.id,
          },
        );
      }
      return null;
    }

    await ctx.scheduler.runAfter(
      0,
      generationActionForStage(project.generationStage),
      {
        projectId,
        ownerId,
        operationId: operation.id,
      },
    );
    return null;
  },
});

export const revise = mutation({
  args: {
    projectId: v.id("brandProjects"),
    request: v.string(),
    region: v.optional(brandRegionIdValidator),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, request, region }) => {
    const ownerId = await getOwnerId(ctx);
    const project = await getOwnedBrandProject(ctx, ownerId, projectId);
    const normalizedRequest = request.trim();
    if (!normalizedRequest) {
      throw new ConvexError("A Semantic Revision request is required");
    }
    if (project.generationStage !== "ready") {
      throw new ConvexError(
        "Semantic Revision is available when every Brand Region is ready",
      );
    }
    const requiredResults = [
      project.directionJson,
      project.logoJson,
      project.colorJson,
      project.typographyJson,
      project.voiceJson,
      project.photographyDirectionJson,
      project.motionJson,
      project.interfaceJson,
      project.designTokensJson,
    ];
    const photographs = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) => q.eq("projectId", projectId))
      .take(photographRoles.length);
    if (
      requiredResults.some((result) => !result) ||
      photographs.length !== photographRoles.length ||
      photographs.some((photograph) => photograph.state !== "ready")
    ) {
      throw new ConvexError(
        "Semantic Revision is available when every Brand Region is ready",
      );
    }
    const operation = claimBrandProjectOperation(
      project.activeOperationId
        ? {
            id: project.activeOperationId,
            kind: project.activeOperationKind ?? "generation",
          }
        : null,
      "revision",
      crypto.randomUUID(),
    );
    const target = region ?? null;
    const revisingRegionIds = getSemanticRevisionRegions(
      target,
      normalizedRequest,
    );
    await ctx.db.patch(projectId, {
      activeOperationId: operation.id,
      activeOperationKind: operation.kind,
      revisingRegionIds,
      revisionError: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.brandRevision.revise, {
      projectId,
      ownerId,
      operationId: operation.id,
      request: normalizedRequest,
      target,
    });
    return null;
  },
});

export const loadBuiltInFallback = mutation({
  args: { projectId: v.id("brandProjects") },
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    const ownerId = await getOwnerId(ctx);
    const project = await getOwnedBrandProject(ctx, ownerId, projectId);
    if (project.activeOperationId) {
      throw new ConvexError(
        "Another generation or revision operation is already active",
      );
    }
    if (project.logoJson || !project.generationError) {
      throw new ConvexError(
        "The built in fallback is available after complete provider failure",
      );
    }

    await ctx.db.patch(projectId, {
      builtInFallback: true,
      generationStage: "ready",
      generationError: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { projectId: v.id("brandProjects") },
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    const ownerId = await getOwnerId(ctx);
    await getOwnedBrandProject(ctx, ownerId, projectId);

    const photographs = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) => q.eq("projectId", projectId))
      .take(photographRoles.length);
    for (const photograph of photographs) {
      await ctx.db.delete(photograph._id);
      if (photograph.storageId) {
        const remainingReference = await ctx.db
          .query("brandPhotographs")
          .withIndex("by_storage_id", (q) =>
            q.eq("storageId", photograph.storageId),
          )
          .first();
        if (!remainingReference) {
          await ctx.storage.delete(photograph.storageId);
        }
      }
    }
    await ctx.db.delete(projectId);
    return null;
  },
});
