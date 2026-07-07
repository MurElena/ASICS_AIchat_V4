import { llmRequestBody } from "./llmRequest";

export type TemplateEditKind = "excel" | "word";

export interface TemplateCellSnapshot {
  row: number;
  col: number;
  value: string;
  contentType: "text" | "prompt";
  html?: string;
}

export interface TemplateEditRequest {
  kind: TemplateEditKind;
  message: string;
  cells: TemplateCellSnapshot[];
  selectedCell?: { row: number; col: number };
  wordHtml?: string;
  apiKey?: string;
  model?: string;
}

export interface TemplateCellUpdate {
  row: number;
  col: number;
  value: string;
  contentType?: "text" | "prompt";
  html?: string;
}

export interface TemplateEditResponse {
  reply: string;
  updates?: TemplateCellUpdate[];
  wordHtml?: string;
  model: string;
}

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function editTemplateWithLlm(
  body: Omit<TemplateEditRequest, "apiKey" | "model">,
): Promise<TemplateEditResponse> {
  const res = await fetch("/api/template-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(llmRequestBody(body)),
  });

  const data = await readJsonSafe<{ error?: string } & Partial<TemplateEditResponse>>(res);
  if (!res.ok) {
    throw new Error(data?.error ?? "Template edit request failed.");
  }
  if (!data?.reply || !data?.model) {
    throw new Error("Template edit returned an invalid response.");
  }
  return data as TemplateEditResponse;
}
