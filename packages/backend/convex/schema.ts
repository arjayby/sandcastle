import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  brandRegionIdValidator,
  generationStageValidator,
  operationKindValidator,
  photographRoleValidator,
} from "./brandGenerationValidators";
import { brandRevisionSnapshotValidator } from "./brandRevisionSnapshotContract";

export default defineSchema({
  brandProjects: defineTable({
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
    revisionCursor: v.optional(v.number()),
    revisionSequence: v.optional(v.number()),
  })
    .index("by_owner_and_updated_at", ["ownerId", "updatedAt"])
    .index("by_owner_and_draft", ["ownerId", "draftId"])
    .index("by_review_token", ["reviewToken"]),
  brandPhotographs: defineTable({
    projectId: v.id("brandProjects"),
    role: photographRoleValidator,
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
  revisions: defineTable({
    projectId: v.id("brandProjects"),
    sequence: v.number(),
    before: brandRevisionSnapshotValidator,
    after: brandRevisionSnapshotValidator,
  }).index("by_project_and_sequence", ["projectId", "sequence"]),
  revisionStorageReferences: defineTable({
    revisionId: v.id("revisions"),
    storageId: v.id("_storage"),
  })
    .index("by_revision", ["revisionId"])
    .index("by_storage_id", ["storageId"]),
});
