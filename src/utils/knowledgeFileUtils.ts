import { readFileAsText } from "./wizardUtils";

export async function extractKnowledgeFileText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    return readFileAsText(file);
  }

  if (ext === "docx" || ext === "pdf") {
    try {
      const raw = await readFileAsText(file);
      const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
      if (cleaned.length > 200) {
        return cleaned.slice(0, 120_000);
      }
    } catch {
      /* fall through */
    }

    return `[Source file: ${file.name} (${ext?.toUpperCase()}). Text could not be fully extracted — infer tone, formatting, and brand-writing rules from the filename and typical brand voice documents of this type.]`;
  }

  throw new Error("Unsupported file type.");
}

export function defaultStyleGuideNameFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Style guide";
}
