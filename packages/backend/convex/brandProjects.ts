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
  generationStageValidator,
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
  directionJson: v.optional(v.string()),
  logoJson: v.optional(v.string()),
  colorJson: v.optional(v.string()),
  typographyJson: v.optional(v.string()),
  voiceJson: v.optional(v.string()),
  photographyDirectionJson: v.optional(v.string()),
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
    });

    await ctx.scheduler.runAfter(0, internal.brandGeneration.generate, {
      projectId,
      ownerId,
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

    const copiedProjectId = await ctx.db.insert("brandProjects", {
      ...getCopyableBrandProjectData(project),
      ownerId,
      draftId: crypto.randomUUID(),
      name: `${project.name ?? project.companyName} copy`,
      updatedAt: Date.now(),
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
          if (photograph.state === "generating") {
            await ctx.scheduler.runAfter(
              0,
              internal.brandGeneration.generatePhotograph,
              {
                projectId: copiedProjectId,
                ownerId,
                role: photograph.role,
              },
            );
          }
        },
      ),
    );

    return copiedProjectId;
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
