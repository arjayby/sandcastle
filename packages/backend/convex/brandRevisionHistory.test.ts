import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { photographRoles } from "./brandGenerationContract";
import {
  captureBrandRevisionSnapshot,
  navigateBrandRevision,
  recordBrandRevisionStorageReferences,
} from "./brandRevisionHistory";
import type { BrandRevisionSnapshot } from "./brandRevisionSnapshotContract";
import schema from "./schema";
import { modules } from "./test.setup";

type TestBackend = TestConvex<typeof schema>;

async function storePhotographs(t: TestBackend, label: string) {
  return await t.run(async (ctx) =>
    Promise.all(
      photographRoles.map(async (role) => ({
        role,
        alt: `${label} ${role}`,
        storageId: await ctx.storage.store(
          new Blob([`${label} ${role}`], { type: "image/png" }),
        ),
        mediaType: "image/png",
      })),
    ),
  );
}

async function seedReadyBrandProject(t: TestBackend) {
  const photographs = await storePhotographs(t, "before");
  const projectId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("brandProjects", {
      ownerId: "brand-builder",
      draftId: crypto.randomUUID(),
      companyName: "Northstar",
      description: "A planning tool for independent product teams.",
      updatedAt: 1,
      generationStage: "ready",
      directionJson: "direction-before",
      logoJson: "logo-before",
      colorJson: "color-before",
      typographyJson: "typography-before",
      voiceJson: "voice-before",
      photographyDirectionJson: "photography-before",
      motionJson: "motion-before",
      interfaceJson: "interface-before",
      designTokensJson: "tokens-before",
    });
    for (const photograph of photographs) {
      await ctx.db.insert("brandPhotographs", {
        projectId: id,
        state: "ready",
        ...photograph,
      });
    }
    return id;
  });
  return { projectId, photographs };
}

async function capture(t: TestBackend, projectId: Id<"brandProjects">) {
  return await t.run(async (ctx) => {
    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new Error("Brand Project not found");
    }
    return await captureBrandRevisionSnapshot(ctx, project);
  });
}

describe("persisted Revision history", () => {
  test("restores every coordinated Brand Region and Brand Photograph", async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedReadyBrandProject(t);
    const before = await capture(t, projectId);
    const revisedPhotographs = await storePhotographs(t, "after");
    const after: BrandRevisionSnapshot = {
      directionJson: "direction-after",
      logoJson: "logo-after",
      colorJson: "color-after",
      typographyJson: "typography-after",
      voiceJson: "voice-after",
      photographyDirectionJson: "photography-after",
      motionJson: "motion-after",
      interfaceJson: "interface-after",
      designTokensJson: "tokens-after",
      photographs: [...revisedPhotographs].sort((left, right) =>
        left.role.localeCompare(right.role),
      ),
    };

    await t.run(async (ctx) => {
      const { photographs, ...brandSystem } = after;
      await ctx.db.patch(projectId, {
        ...brandSystem,
        revisionCursor: 1,
        revisionSequence: 1,
      });
      for (const photograph of photographs) {
        const existing = await ctx.db
          .query("brandPhotographs")
          .withIndex("by_project_and_role", (q) =>
            q.eq("projectId", projectId).eq("role", photograph.role),
          )
          .unique();
        if (!existing) {
          throw new Error("Brand Photograph not found");
        }
        await ctx.db.patch(existing._id, photograph);
      }
      const revisionId = await ctx.db.insert("revisions", {
        projectId,
        sequence: 1,
        before,
        after,
      });
      await recordBrandRevisionStorageReferences(ctx, revisionId, [
        before,
        after,
      ]);
    });

    await t.run(async (ctx) => {
      const project = await ctx.db.get(projectId);
      if (!project) {
        throw new Error("Brand Project not found");
      }
      await navigateBrandRevision(ctx, project, "undo");
    });
    expect(await capture(t, projectId)).toEqual(before);

    await t.run(async (ctx) => {
      const project = await ctx.db.get(projectId);
      if (!project) {
        throw new Error("Brand Project not found");
      }
      await navigateBrandRevision(ctx, project, "redo");
    });
    expect(await capture(t, projectId)).toEqual(after);
  });

  test("retains exactly the latest 20 persisted Revisions", async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedReadyBrandProject(t);

    for (let sequence = 1; sequence <= 21; sequence += 1) {
      const operationId = `revision-${sequence}`;
      await t.run(async (ctx) => {
        await ctx.db.patch(projectId, {
          activeOperationId: operationId,
          activeOperationKind: "revision",
        });
      });
      await t.mutation(internal.brandRevision.applyRevision, {
        projectId,
        operationId,
      });
    }

    const result = await t.run(async (ctx) => ({
      project: await ctx.db.get(projectId),
      revisions: await ctx.db
        .query("revisions")
        .withIndex("by_project_and_sequence", (q) =>
          q.eq("projectId", projectId),
        )
        .take(21),
    }));
    expect(result.revisions).toHaveLength(20);
    expect(result.revisions.map((revision) => revision.sequence)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 2),
    );
    expect(result.project?.colorJson).toBe("color-before");
  });

  test("clears an invalid redo branch and its unreferenced photographs", async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedReadyBrandProject(t);
    const branchPhotographs = await storePhotographs(t, "invalid branch");

    await t.run(async (ctx) => {
      await ctx.db.patch(projectId, {
        activeOperationId: "first-revision",
        activeOperationKind: "revision",
      });
    });
    await t.mutation(internal.brandRevision.applyRevision, {
      projectId,
      operationId: "first-revision",
      photographs: branchPhotographs,
    });
    await t.run(async (ctx) => {
      const project = await ctx.db.get(projectId);
      if (!project) {
        throw new Error("Brand Project not found");
      }
      await navigateBrandRevision(ctx, project, "undo");
    });

    const replacementPhotographs = await storePhotographs(t, "replacement");
    await t.run(async (ctx) => {
      await ctx.db.patch(projectId, {
        activeOperationId: "replacement-revision",
        activeOperationKind: "revision",
      });
    });
    await t.mutation(internal.brandRevision.applyRevision, {
      projectId,
      operationId: "replacement-revision",
      photographs: replacementPhotographs,
    });

    const result = await t.run(async (ctx) => ({
      revisions: await ctx.db
        .query("revisions")
        .withIndex("by_project_and_sequence", (q) =>
          q.eq("projectId", projectId),
        )
        .take(20),
      invalidPhotographs: await Promise.all(
        branchPhotographs.map((photograph) =>
          ctx.storage.get(photograph.storageId),
        ),
      ),
    }));
    expect(result.revisions).toHaveLength(1);
    expect(result.revisions[0]?.sequence).toBe(2);
    expect(result.invalidPhotographs).toEqual([null, null, null, null]);
  });
});
