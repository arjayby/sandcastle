import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  brandProjects: defineTable({
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
  })
    .index("by_owner_and_updated_at", ["ownerId", "updatedAt"])
    .index("by_owner_and_draft", ["ownerId", "draftId"]),
  brandPhotographs: defineTable({
    projectId: v.id("brandProjects"),
    role: v.union(
      v.literal("hero"),
      v.literal("product"),
      v.literal("people"),
      v.literal("texture"),
    ),
    state: v.union(
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    alt: v.string(),
    storageId: v.optional(v.id("_storage")),
    mediaType: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_project_and_role", ["projectId", "role"])
    .index("by_storage_id", ["storageId"]),
});
