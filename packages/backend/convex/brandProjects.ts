import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

async function getOwnerId(
	ctx: Parameters<typeof authComponent.getAuthUser>[0],
) {
	const owner = await authComponent.getAuthUser(ctx);
	return owner._id;
}

export const create = mutation({
	args: {
		draftId: v.string(),
		companyName: v.string(),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const ownerId = await getOwnerId(ctx);
		const companyName = args.companyName.trim();
		const description = args.description.trim();

		if (!companyName || !description) {
			throw new ConvexError("A company name and description are required");
		}

		const existingProject = await ctx.db
			.query("brandProjects")
			.withIndex("by_owner_and_draft", (q) =>
				q.eq("ownerId", ownerId).eq("draftId", args.draftId),
			)
			.unique();

		if (existingProject) {
			return existingProject._id;
		}

		return await ctx.db.insert("brandProjects", {
			ownerId,
			draftId: args.draftId,
			companyName,
			description,
			updatedAt: Date.now(),
		});
	},
});

export const list = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await getOwnerId(ctx);
		return await ctx.db
			.query("brandProjects")
			.withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
			.order("desc")
			.collect();
	},
});

export const get = query({
	args: { projectId: v.id("brandProjects") },
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
	handler: async (ctx, { projectId, companyName, description }) => {
		const ownerId = await getOwnerId(ctx);
		const project = await ctx.db.get(projectId);

		if (!project || project.ownerId !== ownerId) {
			throw new ConvexError("Brand Project not found");
		}

		const normalizedCompanyName = companyName.trim();
		const normalizedDescription = description.trim();
		if (!normalizedCompanyName || !normalizedDescription) {
			throw new ConvexError("A company name and description are required");
		}

		await ctx.db.patch(projectId, {
			companyName: normalizedCompanyName,
			description: normalizedDescription,
			updatedAt: Date.now(),
		});
	},
});
