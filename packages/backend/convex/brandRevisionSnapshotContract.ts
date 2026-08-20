import { type Infer, v } from "convex/values";

import { photographRoleValidator } from "./brandGenerationValidators";

const snapshotPhotographValidator = v.object({
  role: photographRoleValidator,
  alt: v.string(),
  storageId: v.id("_storage"),
  mediaType: v.string(),
});

export const brandRevisionSnapshotValidator = v.object({
  directionJson: v.string(),
  logoJson: v.string(),
  colorJson: v.string(),
  typographyJson: v.string(),
  voiceJson: v.string(),
  photographyDirectionJson: v.string(),
  motionJson: v.string(),
  interfaceJson: v.string(),
  designTokensJson: v.string(),
  photographs: v.array(snapshotPhotographValidator),
});

export type BrandRevisionSnapshot = Infer<
  typeof brandRevisionSnapshotValidator
>;
