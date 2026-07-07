import { hasConfiguredApiKey } from "../data/systemModels";
import { llmRequestBody } from "./llmRequest";
import type { SavedProfile } from "../data/profiles";
import {
  delayDemo,
  demoExtractStyleInstructions,
  demoRegenerateSection,
  demoReviewGeneration,
} from "../data/generationEditorDemo";

export interface GenerationReviewRequest {
  content: string;
  instruction: string;
  profile: SavedProfile;
}

export interface GenerationReviewResponse {
  content: string;
  reply: string;
  model: string;
}

export interface GenerationSectionRequest {
  fullContent: string;
  selectedText: string;
  profile: SavedProfile;
}

export interface GenerationSectionResponse {
  replacement: string;
  model: string;
}

export interface ExtractInstructionsRequest {
  userPrompt: string;
  profile: SavedProfile;
}

export interface ExtractInstructionsResponse {
  instructions: string;
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

export async function reviewGenerationWithLlm(
  body: GenerationReviewRequest,
): Promise<GenerationReviewResponse> {
  if (!hasConfiguredApiKey()) {
    await delayDemo();
    const result = demoReviewGeneration(body.content, body.instruction, body.profile);
    return { ...result, model: "demo" };
  }

  const res = await fetch("/api/generation-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      llmRequestBody({
        action: "review",
        content: body.content,
        instruction: body.instruction,
        profile: body.profile,
      }),
    ),
  });

  const data = await readJsonSafe<{ error?: string } & Partial<GenerationReviewResponse>>(res);
  if (!res.ok) {
    if (res.status === 503) {
      await delayDemo();
      const result = demoReviewGeneration(body.content, body.instruction, body.profile);
      return { ...result, model: "demo" };
    }
    throw new Error(data?.error ?? "Generation review failed.");
  }
  if (!data?.content || !data.reply) {
    throw new Error("Generation review returned an invalid response.");
  }
  return { content: data.content, reply: data.reply, model: data.model ?? "unknown" };
}

export async function regenerateSectionWithLlm(
  body: GenerationSectionRequest,
): Promise<GenerationSectionResponse> {
  if (!hasConfiguredApiKey()) {
    await delayDemo();
    return {
      replacement: demoRegenerateSection(body.fullContent, body.selectedText, body.profile),
      model: "demo",
    };
  }

  const res = await fetch("/api/generation-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      llmRequestBody({
        action: "section",
        fullContent: body.fullContent,
        selectedText: body.selectedText,
        profile: body.profile,
      }),
    ),
  });

  const data = await readJsonSafe<{ error?: string; replacement?: string; model?: string }>(res);
  if (!res.ok) {
    if (res.status === 503) {
      await delayDemo();
      return {
        replacement: demoRegenerateSection(body.fullContent, body.selectedText, body.profile),
        model: "demo",
      };
    }
    throw new Error(data?.error ?? "Section regeneration failed.");
  }
  if (!data?.replacement) {
    throw new Error("Section regeneration returned an invalid response.");
  }
  return { replacement: data.replacement, model: data.model ?? "unknown" };
}

export async function extractStyleInstructions(
  body: ExtractInstructionsRequest,
): Promise<ExtractInstructionsResponse> {
  if (!hasConfiguredApiKey()) {
    await delayDemo();
    return {
      instructions: demoExtractStyleInstructions(body.userPrompt),
      model: "demo",
    };
  }

  const res = await fetch("/api/generation-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      llmRequestBody({
        action: "extract-instructions",
        userPrompt: body.userPrompt,
        profile: body.profile,
      }),
    ),
  });

  const data = await readJsonSafe<{ error?: string; instructions?: string; model?: string }>(res);
  if (!res.ok) {
    if (res.status === 503) {
      await delayDemo();
      return {
        instructions: demoExtractStyleInstructions(body.userPrompt),
        model: "demo",
      };
    }
    throw new Error(data?.error ?? "Could not extract instructions.");
  }
  if (!data?.instructions) {
    throw new Error("Instruction extraction returned an invalid response.");
  }
  return { instructions: data.instructions, model: data.model ?? "unknown" };
}
