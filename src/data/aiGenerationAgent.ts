import { MOCK_GLOSSARIES } from "./knowledgeBase";
import { loadStyleGuides } from "./styleGuidesStore";
import type { ProfileType } from "./profiles";
import {
  OUTPUT_LANGUAGES,
  OUTPUT_LENGTHS,
  PRODUCT_TEMPLATES,
  SINGLE_TEMPLATES,
} from "./wizardConfig";
import {
  type AiGenerationDraft,
  type WorkflowFieldId,
  createEmptyDraft,
  getActiveField,
  isDraftReadyForConfirmation,
  isFieldComplete,
  templatesForType,
} from "./aiGenerationWorkflow";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: "confirmation";
}

export interface AgentTurnResult {
  draft: AiGenerationDraft;
  reply: string;
  messagesToAppend: ChatMessage[];
  openTemplateWizard?: boolean;
}

const AFFIRMATIVE = /^(yes|yep|yeah|correct|looks good|start|go ahead|generate|confirm|proceed|ok|okay|sure)\b/i;
const NEGATIVE = /^(no|nope|not yet|wait|change|edit|back)\b/i;
const TEMPLATE_CREATE = /\b(create|new|build|make)\b.*\btemplate\b|\btemplate\b.*\b(create|new|build|make)\b/i;
const GUIDED_TEMPLATE = /\b(guided|wizard|editor|visual|word|excel|1)\b/i;
const LLM_TEMPLATE = /\b(describe|llm|chat|conversation|tell you|2)\b/i;
const TEMPLATE_DONE = /\b(done|finished|complete|that's all|thats all|ready)\b/i;

function matchTemplate(text: string, type: ProfileType | null): string | null {
  const pool = type === "multiproduct" ? PRODUCT_TEMPLATES : type === "single" ? SINGLE_TEMPLATES : [...SINGLE_TEMPLATES, ...PRODUCT_TEMPLATES];
  const lower = text.toLowerCase();
  const exact = pool.find((t) => lower.includes(t.name.toLowerCase()));
  if (exact) return exact.name;
  const byId = pool.find((t) => lower.includes(t.id.replace(/-/g, " ")));
  return byId?.name ?? null;
}

function matchLanguage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return null;
  const lower = trimmed.toLowerCase();
  const fromList = OUTPUT_LANGUAGES.find((lang) => lower.includes(lang.toLowerCase()));
  if (fromList) return fromList;
  if (/\b(skip|none)\b/i.test(lower)) return null;
  return trimmed;
}

function matchLength(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (/\b(no preference|no limit|skip|any|default|none|don't care|dont care|flexible)\b/i.test(lower)) {
    return "No specific limit";
  }
  if (lower.includes("short") || lower.includes("<100")) return OUTPUT_LENGTHS[0].label;
  if (lower.includes("long") || lower.includes("300")) return OUTPUT_LENGTHS[2].label;
  if (lower.includes("medium") || lower.includes("100")) return OUTPUT_LENGTHS[1].label;
  const fromList = OUTPUT_LENGTHS.find((l) => lower.includes(l.label.toLowerCase()));
  return fromList?.label ?? trimmed;
}

function matchGenerationType(text: string): ProfileType | null {
  const lower = text.toLowerCase();
  if (
    lower.includes("multiproduct") ||
    lower.includes("multi product") ||
    lower.includes("batch") ||
    lower.includes("catalog") ||
    lower.includes("multiple product")
  ) {
    return "multiproduct";
  }
  if (lower.includes("single") || lower.includes("one output") || lower.includes("one file")) {
    return "single";
  }
  return null;
}

function matchGlossaries(text: string): string[] {
  const lower = text.toLowerCase();
  if (/\b(none|skip|no glossary|no glossaries)\b/.test(lower)) return [];

  const matches: string[] = [];
  for (const glossary of MOCK_GLOSSARIES) {
    if (lower.includes(glossary.name.toLowerCase()) || lower.includes(glossary.id)) {
      matches.push(glossary.name);
    }
  }

  const numbered = [...lower.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
  MOCK_GLOSSARIES.forEach((glossary, index) => {
    if (numbered.includes(index + 1)) matches.push(glossary.name);
  });

  return [...new Set(matches)];
}

function matchStyleGuide(text: string): {
  mode: "existing" | "custom" | "none";
  name?: string;
  custom?: string;
} | null {
  const lower = text.toLowerCase();
  if (/\b(none|skip|no style guide|without style)\b/i.test(lower)) {
    return { mode: "none" };
  }
  const guides = loadStyleGuides();

  if (lower.startsWith("custom:") || lower.startsWith("write:") || lower.startsWith("instructions:")) {
    const custom = text.split(":").slice(1).join(":").trim();
    if (custom) return { mode: "custom", custom };
  }

  if (/\b(new|custom|write my own|create)\b/.test(lower) && text.trim().length > 30) {
    return { mode: "custom", custom: text.trim() };
  }

  for (const guide of guides) {
    if (lower.includes(guide.name.toLowerCase())) {
      return { mode: "existing", name: guide.name };
    }
  }

  const numbered = [...lower.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
  for (const num of numbered) {
    if (guides[num - 1]) return { mode: "existing", name: guides[num - 1].name };
  }

  return null;
}

function isCorrectionMessage(text: string): boolean {
  return /\b(change|switch|update|set|use|instead|correct)\b/i.test(text);
}

function applyCorrections(draft: AiGenerationDraft, text: string): AiGenerationDraft {
  let next = { ...draft, awaitingConfirmation: false };
  const type = matchGenerationType(text);
  if (type) next = { ...next, generationType: type };
  const template = matchTemplate(text, next.generationType);
  if (template) next = { ...next, template };
  const language = matchLanguage(text);
  if (language) next = { ...next, language };
  const length = matchLength(text);
  if (length && next.generationType === "single") next = { ...next, maxLength: length };

  const glossaries = matchGlossaries(text);
  if (/\b(none|skip|no glossary)\b/i.test(text)) {
    next = { ...next, glossariesSkipped: true, glossaryNames: [] };
  } else if (glossaries.length > 0) {
    next = { ...next, glossariesSkipped: false, glossaryNames: glossaries };
  }

  const style = matchStyleGuide(text);
  if (style?.mode === "none") {
    next = {
      ...next,
      styleGuideSkipped: true,
      styleGuideMode: "none",
      styleGuideName: null,
      styleGuideCustomInstructions: "",
    };
  } else if (style?.mode === "existing" && style.name) {
    next = { ...next, styleGuideSkipped: false, styleGuideMode: "existing", styleGuideName: style.name, styleGuideCustomInstructions: "" };
  } else if (style?.mode === "custom" && style.custom) {
    next = {
      ...next,
      styleGuideMode: "custom",
      styleGuideName: null,
      styleGuideCustomInstructions: style.custom,
    };
  }

  if (/\b(skip reference|no reference|none)\b/i.test(text) && /\breference\b/i.test(text)) {
    next = { ...next, referenceSkipped: true, referenceFiles: [] };
  }

  return next;
}

function promptForField(field: WorkflowFieldId, draft: AiGenerationDraft): string {
  switch (field) {
    case "generationType":
      return "What **generation type** do you need?\n\n• **Single** — one output file from your input\n• **Multiproduct** — extract every product from the input and generate one batch per item in a single file\n\nReply with *single* or *multiproduct*.";
    case "input":
      return "Now share your **input** — attach files (PDF, DOCX, TXT, XLSX) with 📎 **or** type / paste the source content directly in chat.";
    case "template": {
      const options = templatesForType(draft.generationType);
      const list = options.map((t, i) => `${i + 1}. **${t.name}** — ${t.description}`).join("\n");
      return `Which **template** should we use?\n\n${list}\n\nReply with a name or number, or say **create template** to build a new one.`;
    }
    case "language":
      return `What **language** should the output be written in? Name any language freely (e.g. *French*, *Japanese*, *Canadian French*).`;
    case "maxLength": {
      const suggestions = OUTPUT_LENGTHS.map((l) => `• ${l.label}`).join("\n");
      return `Roughly how long should the output be? This is **not binding** — share any preference or say *no preference*.\n\nSuggestions:\n${suggestions}`;
    }
    case "glossaries": {
      const list = MOCK_GLOSSARIES.map((g, i) => `${i + 1}. ${g.name}`).join("\n");
      return `Choose **glossaries** for brand voice terminology (you can pick more than one), or reply *none*.\n\n${list}`;
    }
    case "styleGuide": {
      const guides = loadStyleGuides();
      const list = guides.map((g, i) => `${i + 1}. ${g.name}`).join("\n");
      return `Choose a **style guide** by name or number, describe custom rules (*custom: …*), or reply **none**.\n\n${list}`;
    }
    case "referenceContent":
      return "Upload **reference content** files with the clip button (PDF, DOCX, TXT only — not from the library). Reply *skip* if you don't need reference uploads.";
    case "confirm":
      return buildConfirmationSummary(draft);
    default:
      return "Tell me what you'd like to adjust in the workflow.";
  }
}

function buildConfirmationSummary(_draft: AiGenerationDraft): string {
  return "Here's your generation setup. Does everything look correct? Reply **yes** to start generation, or tell me what to change.";
}

function applyFieldInput(
  draft: AiGenerationDraft,
  field: WorkflowFieldId,
  text: string,
  files: File[],
): AiGenerationDraft {
  let next = { ...draft };

  switch (field) {
    case "input":
      if (files.length > 0) {
        next = { ...next, inputFiles: [...next.inputFiles, ...files] };
      }
      if (text.trim() && !AFFIRMATIVE.test(text.trim())) {
        next = {
          ...next,
          userTypedInput: next.userTypedInput
            ? `${next.userTypedInput}\n${text.trim()}`
            : text.trim(),
        };
      }
      break;
    case "generationType": {
      const type = matchGenerationType(text);
      if (type) next = { ...next, generationType: type };
      break;
    }
    case "template": {
      if (TEMPLATE_CREATE.test(text)) {
        next = { ...next, templateCreationPhase: "choose_method" };
        break;
      }
      const template = matchTemplate(text, next.generationType);
      if (template) {
        next = { ...next, template, templateCreationPhase: null, templateLlmDescription: "" };
      }
      break;
    }
    case "language": {
      const language = matchLanguage(text);
      if (language) next = { ...next, language };
      break;
    }
    case "maxLength": {
      const length = matchLength(text);
      if (length) next = { ...next, maxLength: length };
      break;
    }
    case "glossaries": {
      if (/\b(none|skip|no)\b/i.test(text)) {
        next = { ...next, glossariesSkipped: true, glossaryNames: [] };
      } else {
        const glossaries = matchGlossaries(text);
        if (glossaries.length > 0) {
          next = { ...next, glossariesSkipped: false, glossaryNames: glossaries };
        }
      }
      break;
    }
    case "styleGuide": {
      const style = matchStyleGuide(text);
      if (style?.mode === "none") {
        next = {
          ...next,
          styleGuideSkipped: true,
          styleGuideMode: "none",
          styleGuideName: null,
          styleGuideCustomInstructions: "",
        };
      } else if (style?.mode === "existing" && style.name) {
        next = { ...next, styleGuideSkipped: false, styleGuideMode: "existing", styleGuideName: style.name, styleGuideCustomInstructions: "" };
      } else if (style?.mode === "custom" && style.custom) {
        next = {
          ...next,
          styleGuideSkipped: false,
          styleGuideMode: "custom",
          styleGuideName: null,
          styleGuideCustomInstructions: style.custom,
        };
      } else if (text.trim().length > 20) {
        next = {
          ...next,
          styleGuideSkipped: false,
          styleGuideMode: "custom",
          styleGuideName: null,
          styleGuideCustomInstructions: text.trim(),
        };
      }
      break;
    }
    case "referenceContent":
      if (/\b(skip|none|no)\b/i.test(text)) {
        next = { ...next, referenceSkipped: true };
      }
      if (files.length > 0) {
        next = {
          ...next,
          referenceSkipped: false,
          referenceFiles: [...next.referenceFiles, ...files],
        };
      }
      break;
    default:
      break;
  }

  return next;
}

function promptTemplateCreationChoice(): string {
  return `Would you like to **create a new template**?\n\n1. **Guided template** — open the Word/Excel editor with preview and tools\n2. **Describe to the LLM** — I'll guide you through defining the template in chat\n\nReply *guided* or *describe*.`;
}

function promptLlmTemplateBuilding(draft: AiGenerationDraft): string {
  if (!draft.templateLlmDescription.trim()) {
    return "Let's define your template together. What kind of content should it produce? Describe sections, tone, and any required fields (e.g. headline, bullets, specs). Say **done** when finished.";
  }
  return "Add more detail about your template structure, or say **done** when you're ready to use it.";
}

function handleTemplateCreationPhase(
  draft: AiGenerationDraft,
  text: string,
): { draft: AiGenerationDraft; reply: string; openTemplateWizard?: boolean } | null {
  if (draft.templateCreationPhase === "choose_method") {
    if (GUIDED_TEMPLATE.test(text)) {
      return {
        draft: { ...draft, templateCreationPhase: "guided_wizard" },
        reply: "Opening the guided template editor — build your Word or Excel template, then save to continue.",
        openTemplateWizard: true,
      };
    }
    if (LLM_TEMPLATE.test(text)) {
      return {
        draft: { ...draft, templateCreationPhase: "llm_building", templateLlmDescription: "" },
        reply: promptLlmTemplateBuilding({ ...draft, templateCreationPhase: "llm_building" }),
      };
    }
    return { draft, reply: promptTemplateCreationChoice() };
  }

  if (draft.templateCreationPhase === "llm_building") {
    let next = { ...draft };
    if (TEMPLATE_DONE.test(text) && next.templateLlmDescription.trim().length > 20) {
      const name = `Custom — ${next.templateLlmDescription.trim().slice(0, 40)}${next.templateLlmDescription.length > 40 ? "…" : ""}`;
      next = { ...next, template: name, templateCreationPhase: null };
      return {
        draft: next,
        reply: `Template captured as **${name}**. ${promptForField(getActiveField(next), next)}`,
      };
    }

    if (text.trim()) {
      next = {
        ...next,
        templateLlmDescription: next.templateLlmDescription
          ? `${next.templateLlmDescription}\n${text.trim()}`
          : text.trim(),
      };
    }

    if (next.templateLlmDescription.trim().length > 80 && TEMPLATE_DONE.test(text)) {
      const name = `Custom — ${next.templateLlmDescription.trim().slice(0, 40)}…`;
      next = { ...next, template: name, templateCreationPhase: null };
      return {
        draft: next,
        reply: `Template captured as **${name}**. ${promptForField(getActiveField(next), next)}`,
      };
    }

    return { draft: next, reply: promptLlmTemplateBuilding(next) };
  }

  return null;
}


export function getWorkflowPrompt(field: WorkflowFieldId, draft: AiGenerationDraft): string {
  return promptForField(field, draft);
}

export function processAgentTurn(
  draft: AiGenerationDraft,
  userText: string,
  uploadedFiles: File[],
): AgentTurnResult {
  const text = userText.trim();
  let nextDraft = { ...draft };

  if (draft.awaitingConfirmation) {
    if (AFFIRMATIVE.test(text)) {
      return {
        draft: nextDraft,
        reply: "",
        messagesToAppend: [],
      };
    }
    if (NEGATIVE.test(text) || isCorrectionMessage(text)) {
      nextDraft = applyCorrections(nextDraft, text);
      nextDraft.awaitingConfirmation = false;
      const active = getActiveField(nextDraft);
      const reply = `Updated. ${promptForField(active, nextDraft)}`;
      return {
        draft: nextDraft,
        reply,
        messagesToAppend: [{ id: `a-${Date.now()}`, role: "assistant", text: reply }],
      };
    }
    const reply =
      "Please reply **yes** to start generation, or tell me what you'd like to change (e.g. *change language to French*).";
    return {
      draft: nextDraft,
      reply,
      messagesToAppend: [{ id: `a-${Date.now()}`, role: "assistant", text: reply }],
    };
  }

  if (isCorrectionMessage(text)) {
    nextDraft = applyCorrections(nextDraft, text);
  }

  const templatePhase = handleTemplateCreationPhase(nextDraft, text);
  if (templatePhase) {
    return {
      draft: templatePhase.draft,
      reply: templatePhase.reply,
      messagesToAppend: [{ id: `a-${Date.now()}`, role: "assistant", text: templatePhase.reply }],
      openTemplateWizard: templatePhase.openTemplateWizard,
    };
  }

  const activeBefore = getActiveField(nextDraft);
  nextDraft = applyFieldInput(nextDraft, activeBefore, text, uploadedFiles);

  if (nextDraft.templateCreationPhase === "choose_method") {
    const reply = promptTemplateCreationChoice();
    return {
      draft: nextDraft,
      reply,
      messagesToAppend: [{ id: `a-${Date.now()}`, role: "assistant", text: reply }],
    };
  }

  if (!isFieldComplete(nextDraft, activeBefore) && text) {
    const hint = `I didn't catch that for **${activeBefore}**. ${promptForField(activeBefore, nextDraft)}`;
    return {
      draft: nextDraft,
      reply: hint,
      messagesToAppend: [{ id: `a-${Date.now()}`, role: "assistant", text: hint }],
    };
  }

  if (isDraftReadyForConfirmation(nextDraft) && !nextDraft.awaitingConfirmation) {
    nextDraft.awaitingConfirmation = true;
    const reply = buildConfirmationSummary(nextDraft);
    return {
      draft: nextDraft,
      reply,
      messagesToAppend: [
        { id: `a-${Date.now()}`, role: "assistant", text: reply, kind: "confirmation" },
      ],
    };
  }

  const active = getActiveField(nextDraft);
  if (active === "confirm") {
    nextDraft.awaitingConfirmation = true;
    const reply = buildConfirmationSummary(nextDraft);
    return {
      draft: nextDraft,
      reply,
      messagesToAppend: [
        { id: `a-${Date.now()}`, role: "assistant", text: reply, kind: "confirmation" },
      ],
    };
  }

  const reply = promptForField(active, nextDraft);
  return {
    draft: nextDraft,
    reply,
    messagesToAppend: [{ id: `a-${Date.now()}`, role: "assistant", text: reply }],
  };
}

export function shouldStartGeneration(
  draft: AiGenerationDraft,
  userText: string,
): boolean {
  return draft.awaitingConfirmation && AFFIRMATIVE.test(userText.trim());
}
