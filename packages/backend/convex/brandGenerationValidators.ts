import { v } from "convex/values";

export const generationStageValidator = v.union(
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
);

export const photographRoleValidator = v.union(
  v.literal("hero"),
  v.literal("product"),
  v.literal("people"),
  v.literal("texture"),
);

export const brandRegionIdValidator = v.union(
  v.literal("logo"),
  v.literal("color"),
  v.literal("typography"),
  v.literal("voice-and-tone"),
  v.literal("photography"),
  v.literal("motion"),
  v.literal("interface-foundation"),
  v.literal("design-tokens"),
);

export const operationKindValidator = v.union(
  v.literal("generation"),
  v.literal("revision"),
);
