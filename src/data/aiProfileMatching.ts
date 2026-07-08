import type { SavedProfile } from "./profiles";

function generationTypeFromText(text: string): SavedProfile["type"] | null {
  const lower = text.toLowerCase();
  if (
    lower.includes("multiproduct") ||
    lower.includes("multi product") ||
    lower.includes("batch") ||
    lower.includes("catalog") ||
    lower.includes("multiple product") ||
    lower.includes("multi-sku")
  ) {
    return "multiproduct";
  }
  if (lower.includes("single") || lower.includes("one output") || lower.includes("one file")) {
    return "single";
  }
  return null;
}

function scoreProfile(profile: SavedProfile, text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  if (lower.includes(profile.name.toLowerCase())) score += 55;
  if (lower.includes(profile.template.toLowerCase())) score += 30;

  const inferredType = generationTypeFromText(text);
  if (inferredType && inferredType === profile.type) score += 35;

  if (lower.includes(profile.language.toLowerCase())) score += 15;
  if (lower.includes(profile.dictionary.toLowerCase())) score += 10;

  if (profile.type === "multiproduct" && /\b(catalog|batch|multi|sku|excel|export)\b/i.test(lower)) {
    score += 18;
  }
  if (
    profile.type === "single" &&
    /\b(product description|description|single|email|social|press)\b/i.test(lower)
  ) {
    score += 12;
  }

  for (const guide of profile.styleGuides) {
    if (lower.includes(guide.toLowerCase())) score += 8;
  }

  return score;
}

export function findProbableProfile(
  text: string,
  profiles: SavedProfile[],
): SavedProfile | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const ranked = profiles
    .map((profile) => ({ profile, score: scoreProfile(profile, trimmed) }))
    .filter((entry) => entry.score >= 28)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.profile ?? null;
}
