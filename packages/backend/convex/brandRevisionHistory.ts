import { ConvexError } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { photographRoles } from "./brandGenerationContract";
import type { BrandRevisionSnapshot } from "./brandRevisionSnapshotContract";
import {
  redoRevision,
  revisionHistoryLimit,
  undoRevision,
} from "./revisionHistoryContract";

export async function captureBrandRevisionSnapshot(
  ctx: MutationCtx,
  project: Doc<"brandProjects">,
): Promise<BrandRevisionSnapshot> {
  const {
    directionJson,
    logoJson,
    colorJson,
    typographyJson,
    voiceJson,
    photographyDirectionJson,
    motionJson,
    interfaceJson,
    designTokensJson,
  } = project;
  if (
    !directionJson ||
    !logoJson ||
    !colorJson ||
    !typographyJson ||
    !voiceJson ||
    !photographyDirectionJson ||
    !motionJson ||
    !interfaceJson ||
    !designTokensJson
  ) {
    throw new ConvexError("Brand System is not ready for Revision history");
  }

  const photographs = await ctx.db
    .query("brandPhotographs")
    .withIndex("by_project_and_role", (q) => q.eq("projectId", project._id))
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
    throw new ConvexError("Brand System is not ready for Revision history");
  }

  return {
    directionJson,
    logoJson,
    colorJson,
    typographyJson,
    voiceJson,
    photographyDirectionJson,
    motionJson,
    interfaceJson,
    designTokensJson,
    photographs: photographs.map((photograph) => ({
      role: photograph.role,
      alt: photograph.alt,
      storageId: photograph.storageId as Id<"_storage">,
      mediaType: photograph.mediaType as string,
    })),
  };
}

export async function restoreBrandRevisionSnapshot(
  ctx: MutationCtx,
  projectId: Id<"brandProjects">,
  snapshot: BrandRevisionSnapshot,
) {
  const { photographs, ...brandSystem } = snapshot;
  await ctx.db.patch(projectId, brandSystem);

  for (const photograph of photographs) {
    const existing = await ctx.db
      .query("brandPhotographs")
      .withIndex("by_project_and_role", (q) =>
        q.eq("projectId", projectId).eq("role", photograph.role),
      )
      .unique();
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
        projectId,
        state: "ready",
        ...photograph,
      });
    }
  }
}

export async function recordBrandRevisionStorageReferences(
  ctx: MutationCtx,
  revisionId: Id<"revisions">,
  snapshots: BrandRevisionSnapshot[],
) {
  const storageIds = new Set(
    snapshots.flatMap((snapshot) =>
      snapshot.photographs.map((photograph) => photograph.storageId),
    ),
  );
  for (const storageId of storageIds) {
    await ctx.db.insert("revisionStorageReferences", {
      revisionId,
      storageId,
    });
  }
}

export async function deleteBrandRevision(
  ctx: MutationCtx,
  revision: Doc<"revisions">,
) {
  const references = await ctx.db
    .query("revisionStorageReferences")
    .withIndex("by_revision", (q) => q.eq("revisionId", revision._id))
    .take(photographRoles.length * 2);
  for (const reference of references) {
    await ctx.db.delete(reference._id);
  }
  await ctx.db.delete(revision._id);

  for (const storageId of new Set(
    references.map((reference) => reference.storageId),
  )) {
    const [activeReference, historyReference] = await Promise.all([
      ctx.db
        .query("brandPhotographs")
        .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
        .first(),
      ctx.db
        .query("revisionStorageReferences")
        .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
        .first(),
    ]);
    if (!activeReference && !historyReference) {
      await ctx.storage.delete(storageId);
    }
  }
}

export async function navigateBrandRevision(
  ctx: MutationCtx,
  project: Doc<"brandProjects">,
  direction: "undo" | "redo",
) {
  if (project.activeOperationId) {
    throw new ConvexError(
      `${direction === "undo" ? "Undo" : "Redo"} is unavailable while a Brand operation runs`,
    );
  }

  const revisions = await ctx.db
    .query("revisions")
    .withIndex("by_project_and_sequence", (q) => q.eq("projectId", project._id))
    .order("asc")
    .take(revisionHistoryLimit);
  const history = {
    revisions: revisions.map((revision) => ({
      sequence: revision.sequence,
      before: revision.before,
      after: revision.after,
    })),
    cursor: project.revisionCursor ?? 0,
    nextSequence: (project.revisionSequence ?? 0) + 1,
  };
  const navigation =
    direction === "undo" ? undoRevision(history) : redoRevision(history);
  if (!navigation) {
    throw new ConvexError(
      `No Revision is available to ${direction === "undo" ? "undo" : "redo"}`,
    );
  }

  await restoreBrandRevisionSnapshot(ctx, project._id, navigation.state);
  await ctx.db.patch(project._id, {
    revisionCursor: navigation.history.cursor,
    updatedAt: Date.now(),
  });
}
