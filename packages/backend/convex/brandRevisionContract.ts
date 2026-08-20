import type { BrandRegionId } from "./brandGenerationValidators";

export const directBrandRegionDependencies: Record<
  BrandRegionId,
  readonly BrandRegionId[]
> = {
  logo: [],
  color: ["interface-foundation", "design-tokens"],
  typography: ["interface-foundation", "design-tokens"],
  "voice-and-tone": ["interface-foundation"],
  photography: [],
  motion: ["interface-foundation", "design-tokens"],
  "interface-foundation": [],
  "design-tokens": [],
};

export const brandRegionIds = Object.keys(
  directBrandRegionDependencies,
) as BrandRegionId[];

const explicitImageRequestPattern =
  /\b(image|images|imagery|photo|photograph|photographs|photography)\b/i;
const invalidatingDirectionPattern =
  /\b(radical|radically|entirely new|start over|replace the direction|complete direction change)\b/i;

export function shouldCreateBrandPhotographs(
  target: BrandRegionId | null,
  request: string,
) {
  return (
    target === "photography" ||
    explicitImageRequestPattern.test(request) ||
    (target === null && invalidatingDirectionPattern.test(request))
  );
}

export function getSemanticRevisionRegions(
  target: BrandRegionId | null,
  request: string,
) {
  const affected = new Set<BrandRegionId>(
    target === null
      ? brandRegionIds
      : [target, ...directBrandRegionDependencies[target]],
  );
  if (shouldCreateBrandPhotographs(target, request)) {
    affected.add("photography");
  }
  return brandRegionIds.filter((region) => affected.has(region));
}
