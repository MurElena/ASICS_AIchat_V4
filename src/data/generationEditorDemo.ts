import type { SavedProfile } from "./profiles";

const DEMO_DELAY_MS = 900;

export function delayDemo() {
  return new Promise((resolve) => window.setTimeout(resolve, DEMO_DELAY_MS));
}

export function demoReviewGeneration(
  content: string,
  instruction: string,
  profile: SavedProfile,
): { content: string; reply: string } {
  const lower = instruction.toLowerCase();
  let updated = content;

  if (lower.includes("shorter") || lower.includes("concise")) {
    updated = content
      .split("\n")
      .filter((line) => line.trim())
      .slice(0, Math.max(8, Math.floor(content.split("\n").length * 0.7)))
      .join("\n");
  }

  if (lower.includes("bullet") || lower.includes("bullets")) {
    const lines = updated.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("*"));
    if (lines.length > 2) {
      updated += "\n\n**Key features (revised)**\n" + lines.slice(0, 4).map((l) => `- ${l.replace(/^[-*]\s*/, "")}`).join("\n");
    }
  }

  if (lower.includes("formal") || lower.includes("professional")) {
    updated = updated.replace(/\b(Meet|Built for|Experience)\b/g, (m) =>
      m === "Meet" ? "Introducing" : m === "Built for" ? "Engineered for" : "Delivers",
    );
  }

  if (lower.includes("enthusias") || lower.includes("energetic")) {
    updated = updated.replace(/\.\s/g, "! ");
  }

  if (updated === content && instruction.trim()) {
    updated = `${content.trim()}\n\n---\n*Revision note (${profile.language}): applied guidance — ${instruction.trim().slice(0, 120)}${instruction.length > 120 ? "…" : ""}*`;
  }

  return {
    content: updated,
    reply: "Updated the generation based on your instructions. Review the document and edit further if needed.",
  };
}

export function demoRegenerateSection(
  _fullContent: string,
  selectedText: string,
  profile: SavedProfile,
): string {
  const trimmed = selectedText.trim();
  if (!trimmed) return selectedText;

  const isHeading = trimmed.startsWith("#");
  if (isHeading) {
    return trimmed.replace(/^#+\s*/, "") + " — refreshed";
  }

  if (trimmed.length < 80) {
    return `${trimmed.replace(/\.$/, "")} — rewritten for ${profile.template.toLowerCase()} (${profile.language}).`;
  }

  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed.slice(0, 60);
  const lengthHint = profile.type === "single" ? profile.length.toLowerCase() : "catalog copy";
  return `${firstSentence}. Updated for clarity, ${profile.dictionary.toLowerCase()} terminology, and ${lengthHint}.`;
}

export function demoExtractStyleInstructions(userPrompt: string): string {
  const text = userPrompt.trim();
  if (!text) return "";

  const rules: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("shorter") || lower.includes("concise")) {
    rules.push("- Prefer shorter sentences and tighter paragraphs in product copy.");
  }
  if (lower.includes("formal") || lower.includes("professional")) {
    rules.push("- Use a more formal, professional tone; avoid casual phrasing.");
  }
  if (lower.includes("enthusias") || lower.includes("energetic")) {
    rules.push("- Allow energetic, performance-led language where appropriate.");
  }
  if (lower.includes("bullet")) {
    rules.push("- Use bullet lists for key features (4–6 items max).");
  }
  if (lower.includes("never") || lower.includes("don't") || lower.includes("do not")) {
    const match = text.match(/(?:never|don't|do not)\s+[^.!?]+/i);
    if (match) rules.push(`- ${match[0].charAt(0).toUpperCase()}${match[0].slice(1).replace(/\.$/, "")}.`);
  }
  if (lower.includes("always")) {
    const match = text.match(/always\s+[^.!?]+/i);
    if (match) rules.push(`- ${match[0].charAt(0).toUpperCase()}${match[0].slice(1).replace(/\.$/, "")}.`);
  }

  if (rules.length === 0) {
    return `- ${text.charAt(0).toUpperCase()}${text.slice(1).replace(/\.$/, "")}.`;
  }

  return rules.join("\n");
}
