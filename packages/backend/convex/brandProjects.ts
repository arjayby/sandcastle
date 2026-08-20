import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { photographRoles } from "./brandGenerationContract";
import {
  brandRegionIdValidator,
  generationStageValidator,
  operationKindValidator,
  photographRoleValidator,
} from "./brandGenerationValidators";

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
    ...copyableData
  } = project;
  void [_id, _creationTime, ownerId, draftId, name, updatedAt];
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

    const projectId = await ctx.db.insert("brandProjects", {
      ownerId,
      draftId: args.draftId,
      name: brandBrief.companyName,
      ...brandBrief,
      updatedAt: Date.now(),
      generationStage: "direction",
      activeOperationId: crypto.randomUUID(),
      activeOperationKind: "generation",
      generationRecoveryCount: 0,
    });

    const project = await ctx.db.get(projectId);
    if (!project?.activeOperationId) {
      throw new ConvexError("Brand generation operation could not start");
    }

    await ctx.scheduler.runAfter(0, internal.brandGeneration.generate, {
      projectId,
      ownerId,
      operationId: project.activeOperationId,
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

    const records = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) => q.eq("projectId", projectId))
      .take(photographRoles.length);
    const byRole = new Map(records.map((record) => [record.role, record]));
    const photographs = await Promise.all(
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

    return { ...project, photographs };
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
    const copiedOperationId = project.activeOperationId
      ? crypto.randomUUID()
      : undefined;

    const copiedProjectId = await ctx.db.insert("brandProjects", {
      ...getCopyableBrandProjectData(project),
      ownerId,
      draftId: crypto.randomUUID(),
      name: `${project.name ?? project.companyName} copy`,
      updatedAt: Date.now(),
      activeOperationId: copiedOperationId,
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
          if (photograph.state === "generating" && copiedOperationId) {
            await ctx.scheduler.runAfter(
              0,
              internal.brandGeneration.generatePhotograph,
              {
                projectId: copiedProjectId,
                ownerId,
                role: photograph.role,
                operationId: copiedOperationId,
              },
            );
          }
        },
      ),
    );
    if (copiedOperationId && project.generationStage !== "photography") {
      const action = [
        "motion",
        "interface-foundation",
        "design-tokens",
      ].includes(project.generationStage ?? "")
        ? internal.brandGeneration.generateAppliedRegions
        : internal.brandGeneration.generate;
      await ctx.scheduler.runAfter(0, action, {
        projectId: copiedProjectId,
        ownerId,
        operationId: copiedOperationId,
      });
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
    if (project.activeOperationId) {
      throw new ConvexError(
        "Another generation or revision operation is already active",
      );
    }
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

    const operationId = crypto.randomUUID();
    await ctx.db.patch(projectId, {
      activeOperationId: operationId,
      activeOperationKind: "generation",
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
          { projectId, ownerId, role: photograph.role, operationId },
        );
      }
      return null;
    }

    const action = ["motion", "interface-foundation", "design-tokens"].includes(
      project.generationStage,
    )
      ? internal.brandGeneration.generateAppliedRegions
      : internal.brandGeneration.generate;
    await ctx.scheduler.runAfter(0, action, {
      projectId,
      ownerId,
      operationId,
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
    if (project.generationStage !== "direction" || !project.generationError) {
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
