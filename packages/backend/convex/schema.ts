import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	brandProjects: defineTable({
		ownerId: v.string(),
		draftId: v.string(),
		companyName: v.string(),
		description: v.string(),
		updatedAt: v.number(),
	})
		.index("by_owner", ["ownerId"])
		.index("by_owner_and_draft", ["ownerId", "draftId"]),
});
