const DRAFT_STORAGE_KEY = "sandcastle.brand-brief-draft.v1";

export interface BrandBriefDraft {
  id: string;
  companyName: string;
  description: string;
}

function isBrandBriefDraft(value: unknown): value is BrandBriefDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<BrandBriefDraft>;
  return (
    typeof draft.id === "string" &&
    typeof draft.companyName === "string" &&
    typeof draft.description === "string"
  );
}

export function saveBrandBriefDraft(
  companyName: string,
  description: string,
): BrandBriefDraft {
  const draft = {
    id: crypto.randomUUID(),
    companyName: companyName.trim(),
    description: description.trim(),
  };
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  return draft;
}

export function loadBrandBriefDraft(): BrandBriefDraft | null {
  const storedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
  if (!storedDraft) {
    return null;
  }

  try {
    const parsedDraft: unknown = JSON.parse(storedDraft);
    return isBrandBriefDraft(parsedDraft) ? parsedDraft : null;
  } catch {
    return null;
  }
}

export function clearBrandBriefDraft() {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}
