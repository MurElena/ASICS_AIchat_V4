import { hasConfiguredApiKey } from "../data/systemModels";
import { llmRequestBody } from "./llmRequest";
import {
  buildDemoStyleGuideOutput,
  DEMO_GENERATION_DELAY_MS,
} from "../data/styleGuideDemo";

export interface StyleGuideGenerateRequest {
  fileName: string;
  fileContent: string;
  forceDemo?: boolean;
}

export interface StyleGuideGenerateResponse {
  name: string;
  content: string;
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

export async function generateStyleGuideFromDocument(
  body: StyleGuideGenerateRequest,
): Promise<StyleGuideGenerateResponse> {
  if (body.forceDemo || !hasConfiguredApiKey()) {
    await new Promise((resolve) => window.setTimeout(resolve, DEMO_GENERATION_DELAY_MS));
    return buildDemoStyleGuideOutput(body.fileName, body.fileContent);
  }

  const res = await fetch("/api/style-guide-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      llmRequestBody({
        fileName: body.fileName,
        fileContent: body.fileContent,
      }),
    ),
  });

  const data = await readJsonSafe<{ error?: string } & Partial<StyleGuideGenerateResponse>>(res);
  if (!res.ok) {
    if (res.status === 503) {
      await new Promise((resolve) => window.setTimeout(resolve, DEMO_GENERATION_DELAY_MS));
      return buildDemoStyleGuideOutput(body.fileName, body.fileContent);
    }
    throw new Error(data?.error ?? "Style guide generation failed.");
  }
  if (!data?.name || !data?.content || !data?.model) {
    throw new Error("Style guide generation returned an invalid response.");
  }
  return data as StyleGuideGenerateResponse;
}
