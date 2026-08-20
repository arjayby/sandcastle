import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const brandProjectValidator = v.object({
  _id: v.id("brandProjects"),
  _creationTime: v.number(),
  ownerId: v.string(),
  draftId: v.string(),
  name: v.optional(v.string()),
  companyName: v.string(),
  description: v.string(),
  updatedAt: v.number(),
  generationStage: v.optional(
    v.union(
      v.literal("direction"),
      v.literal("logo"),
      v.literal("color"),
      v.literal("typography"),
      v.literal("voice-and-tone"),
      v.literal("photography-direction"),
      v.literal("photography"),
      v.literal("motion"),
      v.literal("interface-foundation"),
      v.literal("design-tokens"),
      v.literal("ready"),
      v.literal("failed"),
    ),
  ),
  generationError: v.optional(v.string()),
  directionJson: v.optional(v.string()),
  logoJson: v.optional(v.string()),
  colorJson: v.optional(v.string()),
  typographyJson: v.optional(v.string()),
  voiceJson: v.optional(v.string()),
  photographyDirectionJson: v.optional(v.string()),
  motionJson: v.optional(v.string()),
  interfaceJson: v.optional(v.string()),
  designTokensJson: v.optional(v.string()),
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
  returns: v.union(brandProjectValidator, v.null()),
  handler: async (ctx, { projectId }) => {
    const ownerId = await getOwnerId(ctx);
    const project = await ctx.db.get(projectId);
    return project?.ownerId === ownerId ? project : null;
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

    return await ctx.db.insert("brandProjects", {
      ...getCopyableBrandProjectData(project),
      ownerId,
      draftId: crypto.randomUUID(),
      name: `${project.name ?? project.companyName} copy`,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { projectId: v.id("brandProjects") },
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    const ownerId = await getOwnerId(ctx);
    await getOwnedBrandProject(ctx, ownerId, projectId);

    await ctx.db.delete(projectId);
    return null;
  },
});
