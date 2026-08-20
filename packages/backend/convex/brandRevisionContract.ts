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

const imageSubjectPattern =
  /\b(image|images|imagery|photo|photos|photograph|photographs|photography)\b/i;
const imageChangePattern =
  /(?:\b(create|generate|regenerate|replace|refresh|reshoot|rework|change|update|revise|reimagine)\b.{0,48}\b(image|images|imagery|photo|photos|photograph|photographs|photography)\b)|(?:\b(new|different|replacement|fresh)\s+(brand\s+)?(image|images|imagery|photo|photos|photograph|photographs|photography)\b)|(?:\b(image|images|imagery|photo|photos|photograph|photographs|photography)\b.{0,48}\b(create|generate|regenerate|replace|refresh|reshoot|rework|change|update|revise|reimagine)\b)/i;
const imagePreservationPattern =
  /\b(keep|retain|reuse|preserve|leave|avoid|do not|don't|dont|never|without)\b.{0,48}\b(image|images|imagery|photo|photos|photograph|photographs|photography)\b|\b(image|images|imagery|photo|photos|photograph|photographs|photography)\b.{0,48}\b(unchanged|existing|same|as is)\b/i;
const invalidatingDirectionPattern =
  /\b(start over|replace the direction|complete direction change|entirely new (brand|visual) direction|(?:replace|overhaul|reimagine) the (entire|complete|whole) (brand|visual|direction|system))\b/i;

function explicitlyRequestsNewBrandPhotographs(request: string) {
  return request.split(/[.!?;\n]+/).some((segment) => {
    if (!imageSubjectPattern.test(segment)) {
      return false;
    }
    return (
      imageChangePattern.test(segment) &&
      !imagePreservationPattern.test(segment)
    );
  });
}

export function shouldCreateBrandPhotographs(
  target: BrandRegionId | null,
  request: string,
) {
  return (
    target === "photography" ||
    explicitlyRequestsNewBrandPhotographs(request) ||
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
