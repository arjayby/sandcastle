import type { BrandRegion } from "@/lib/brand-system";

type BrandPhotograph = Extract<
  BrandRegion,
  { id: "photography" }
>["content"]["photographs"][number];

const imageExtensions: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function artifactName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "") || "brand-artifact"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function extensionFor(mediaType: string) {
  const normalizedMediaType = mediaType.split(";", 1)[0]?.trim().toLowerCase();
  const extension = normalizedMediaType
    ? imageExtensions[normalizedMediaType]
    : undefined;
  if (!extension) {
    throw new Error(`Unsupported image media type: ${mediaType || "unknown"}`);
  }
  return extension;
}

export async function copyBrandArtifact(value: string) {
  await navigator.clipboard.writeText(value);
}

export function downloadLogo(
  projectName: string,
  variantName: string,
  svg: string,
) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(
    blob,
    `${artifactName(projectName)}-${artifactName(variantName)}.svg`,
  );
}

export async function downloadBrandPhotograph({
  projectName,
  role,
  url,
  colors,
}: {
  projectName: string;
  role: BrandPhotograph["role"];
  url?: string;
  colors?: BrandPhotograph["colors"];
}) {
  let blob: Blob;
  if (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Photograph download failed with ${response.status}`);
    }
    blob = await response.blob();
  } else if (colors) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="${colors[0]}"/><circle cx="860" cy="240" r="310" fill="${colors[1]}"/><path d="M0 690L420 310l300 260 220-180 260 300v210H0z" fill="${colors[2]}"/></svg>`;
    blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  } else {
    throw new Error("Brand Photograph is not ready to download");
  }

  const extension = extensionFor(blob.type);
  downloadBlob(
    blob,
    `${artifactName(projectName)}-${artifactName(role)}-photograph.${extension}`,
  );
}
