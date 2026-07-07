import { extractKnowledgeFileText } from "./knowledgeFileUtils";
import { readFileAsText } from "./wizardUtils";

export async function extractInputFileText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    const text = await readFileAsText(file);
    return text.trim().slice(0, 120_000);
  }

  if (ext === "pdf" || ext === "docx") {
    return extractKnowledgeFileText(file);
  }

  if (ext === "xlsx") {
    return `[Spreadsheet: ${file.name}]\nTabular product/catalog data uploaded for generation context. Columns and rows will be parsed during multiproduct extraction.`;
  }

  throw new Error("Unsupported file type.");
}
