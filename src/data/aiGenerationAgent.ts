import { MOCK_GLOSSARIES } from "./knowledgeBase";
import { findProbableProfile } from "./aiProfileMatching";
import { loadStyleGuides } from "./styleGuidesStore";
import type { ProfileType, SavedProfile } from "./profiles";
import {
  OUTPUT_LANGUAGES,
  OUTPUT_LENGTHS,
  PRODUCT_TEMPLATES,
  REFERENCE_DOCUMENTS,
  SINGLE_TEMPLATES,
} from "./wizardConfig";
import {
  type AiGenerationDraft,
  type WorkflowFieldId,
  clearFieldValue,
  draftFromSavedProfile,
  getActiveField,
  getFieldDisplayValue,
  isDraftReadyForConfirmation,
  isFieldComplete,
  isMultiSelectField,
  templatesForType,
  toggleMultiSelectValue,
} from "./aiGenerationWorkflow";

export interface AgentChoice {
  id: string;
  label: string;
  value: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: "confirmation" | "profile-confirmation";
  choices?: AgentChoice[];
}

export interface AgentTurnResult {
  draft: AiGenerationDraft;
  reply: string;
  messagesToAppend: ChatMessage[];
  openTemplateWizard?: boolean;
  startGeneration?: boolean;
  saveProfileName?: string;
  closeChat?: boolean;
}

export interface ProcessAgentOptions {
  isFirstTurn?: boolean;
  profiles?: SavedProfile[];
}

const AFFIRMATIVE = /^(yes|yep|yeah|correct|looks good|start|go ahead|generate|confirm|proceed|ok|okay|sure|looks correct|that's correct|thats correct)\b/i;
const NEGATIVE = /^(no|nope|not yet|wait|change|edit|back|change settings)\b/i;
const TEMPLATE_CREATE = /\b(create|new|build|make)\b.*\btemplate\b|\btemplate\b.*\b(create|new|build|make)\b/i;
const GUIDED_TEMPLATE = /\b(guided|wizard|editor|visual|word|excel|1)\b/i;
const LLM_TEMPLATE = /\b(describe|llm|chat|conversation|tell you|2)\b/i;
const TEMPLATE_DONE = /\b(done|finished|complete|that's all|thats all|ready)\b/i;
const DONE_SELECTING = /\bdone selecting\b/i;
const SAVE_AND_GENERATE = /^save and generate$/i;

function msgId() {
  return `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function assistantMessage(text: string, extra?: Partial<ChatMessage>): ChatMessage {
  return { id: msgId(), role: "assistant", text, ...extra };
}

function matchTemplate(text: string, type: ProfileType | null): string | null {
  const pool =
    type === "multiproduct"
      ? PRODUCT_TEMPLATES
      : type === "single"
        ? SINGLE_TEMPLATES
        : [...SINGLE_TEMPLATES, ...PRODUCT_TEMPLATES];
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

function matchStyleGuides(text: string): string[] {
  const lower = text.toLowerCase();
  if (/\b(none|skip|no style guide|without style)\b/i.test(lower)) return [];

  const guides = loadStyleGuides();
  const matches: string[] = [];
  for (const guide of guides) {
    if (lower.includes(guide.name.toLowerCase())) matches.push(guide.name);
  }
  const numbered = [...lower.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
  for (const num of numbered) {
    if (guides[num - 1]) matches.push(guides[num - 1].name);
  }
  return [...new Set(matches)];
}

function matchReferenceContent(text: string): string[] {
  const lower = text.toLowerCase();
  if (/\b(none|skip|no reference)\b/i.test(lower)) return [];

  const matches: string[] = [];
  for (const ref of REFERENCE_DOCUMENTS) {
    if (lower.includes(ref.label.toLowerCase())) matches.push(ref.label);
  }
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

function wantsToPickStepToEdit(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (
    trimmed === "change" ||
    trimmed === "change settings" ||
    trimmed === "change something" ||
    trimmed === "edit" ||
    trimmed === "back"
  ) {
    return true;
  }
  return /^(no|nope|not yet|wait)$/i.test(trimmed);
}

function beginStepSelection(draft: AiGenerationDraft): AgentTurnResult {
  const next = {
    ...draft,
    awaitingConfirmation: false,
    awaitingProfileConfirmation: false,
    awaitingStepSelection: true,
    editingFieldId: null,
  };
  const reply =
    "Click the step in the **workflow panel** on the left that you'd like to change.";
  return {
    draft: next,
    reply,
    messagesToAppend: [assistantMessage(reply)],
  };
}

function applyCorrections(draft: AiGenerationDraft, text: string): AiGenerationDraft {
  let next = { ...draft, awaitingConfirmation: false, awaitingProfileConfirmation: false };
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

  const styleGuides = matchStyleGuides(text);
  if (/\b(none|skip|no style guide)\b/i.test(text)) {
    next = {
      ...next,
      styleGuideSkipped: true,
      styleGuideMode: "none",
      styleGuideNames: [],
      styleGuideCustomInstructions: "",
    };
  } else if (styleGuides.length > 0) {
    next = {
      ...next,
      styleGuideSkipped: false,
      styleGuideMode: "existing",
      styleGuideNames: styleGuides,
      styleGuideCustomInstructions: "",
    };
  }

  const style = matchStyleGuide(text);
  if (style?.mode === "custom" && style.custom) {
    next = {
      ...next,
      styleGuideMode: "custom",
      styleGuideNames: [],
      styleGuideCustomInstructions: style.custom,
    };
  }

  const refs = matchReferenceContent(text);
  if (/\b(skip reference|no reference|none)\b/i.test(text) && /\breference\b/i.test(text)) {
    next = { ...next, referenceContentSkipped: true, referenceContentNames: [] };
  } else if (refs.length > 0) {
    next = { ...next, referenceContentSkipped: false, referenceContentNames: refs };
  }

  return next;
}

function promptForField(field: WorkflowFieldId, draft: AiGenerationDraft): string {
  switch (field) {
    case "generationType":
      return "What **generation type** do you need?";
    case "input":
      return "Share your **context input** — attach files with the clip **or** type / paste source content in chat.";
    case "template":
      return "Which **template** should we use? Pick one below or type a different answer.";
    case "language":
      return "What **language** should the output be written in?";
    case "maxLength":
      return "Roughly how long should the output be? (Not binding — any preference is fine.)";
    case "glossaries":
      return "Choose **glossaries** for brand voice terminology, or pick none.";
    case "styleGuide":
      return "Choose one or more **style guides** from Brand Voice. Select multiple, then **Done selecting** — or pick **None**.";
    case "referenceContent":
      return "Choose **reference content** from Brand Voice (same library as Configuration). Select multiple, then **Done selecting** — or pick **None**.";
    case "confirm":
      return buildConfirmationSummary(draft);
    default:
      return "Tell me what you'd like to adjust.";
  }
}

function buildConfirmationSummary(_draft: AiGenerationDraft): string {
  return "Here's your generation setup. Does everything look correct?";
}

function buildProfileConfirmationSummary(draft: AiGenerationDraft): string {
  return `I found a saved profile that matches your request: **${draft.matchedProfileName}**. The agent panel is filled with its settings — is everything correct?`;
}

function promptTemplateCreationChoice(): string {
  return "How would you like to **create a new template**?";
}

function promptLlmTemplateBuilding(draft: AiGenerationDraft): string {
  if (!draft.templateLlmDescription.trim()) {
    return "Describe your template structure. Say **done** when finished.";
  }
  return "Add more detail, or say **done** when ready.";
}

function handleTemplateCreationPhase(
  draft: AiGenerationDraft,
  text: string,
): { draft: AiGenerationDraft; reply: string; openTemplateWizard?: boolean } | null {
  if (draft.templateCreationPhase === "choose_method") {
    if (GUIDED_TEMPLATE.test(text)) {
      return {
        draft: { ...draft, templateCreationPhase: "guided_wizard" },
        reply: "Opening the guided template editor — build your template, then save to continue.",
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

function applyFieldInput(
  draft: AiGenerationDraft,
  field: WorkflowFieldId,
  text: string,
  files: File[],
): AiGenerationDraft {
  let next: AiGenerationDraft = { ...draft, editingFieldId: null };

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
      if (DONE_SELECTING.test(text)) break;
      const style = matchStyleGuide(text);
      if (style?.mode === "none") {
        next = {
          ...next,
          styleGuideSkipped: true,
          styleGuideMode: "none",
          styleGuideNames: [],
          styleGuideCustomInstructions: "",
        };
        break;
      }
      const guides = matchStyleGuides(text);
      if (guides.length > 0) {
        for (const guide of guides) {
          next = toggleMultiSelectValue(next, "styleGuide", guide);
        }
        break;
      }
      if (style?.mode === "existing" && style.name) {
        next = {
          ...next,
          styleGuideSkipped: false,
          styleGuideMode: "existing",
          styleGuideNames: [style.name],
          styleGuideCustomInstructions: "",
        };
        break;
      }
      if (style?.mode === "custom" && style.custom) {
        next = {
          ...next,
          styleGuideSkipped: false,
          styleGuideMode: "custom",
          styleGuideNames: [],
          styleGuideCustomInstructions: style.custom,
        };
        break;
      }
      if (text.trim().length > 20) {
        next = {
          ...next,
          styleGuideSkipped: false,
          styleGuideMode: "custom",
          styleGuideNames: [],
          styleGuideCustomInstructions: text.trim(),
        };
      }
      break;
    }
    case "referenceContent":
      if (DONE_SELECTING.test(text)) break;
      if (/\b(skip|none|no)\b/i.test(text)) {
        next = { ...next, referenceContentSkipped: true, referenceContentNames: [] };
        break;
      }
      {
        const refs = matchReferenceContent(text);
        for (const ref of refs) {
          next = toggleMultiSelectValue(next, "referenceContent", ref);
        }
      }
      break;
    default:
      break;
  }

  return next;
}

export function getChoicesForDraft(draft: AiGenerationDraft): AgentChoice[] {
  if (draft.saveProfilePhase === "ask") {
    return [
      { id: "save-yes", label: "Yes, save profile", value: "yes" },
      { id: "save-no", label: "No thanks", value: "no" },
    ];
  }

  if (draft.awaitingProfileConfirmation) {
    return [
      { id: "profile-yes", label: "Yes, looks correct", value: "yes" },
      { id: "profile-change", label: "Change settings", value: "change settings" },
    ];
  }

  if (draft.awaitingConfirmation) {
    return [
      { id: "confirm-yes", label: "Yes, generate", value: "yes" },
      { id: "confirm-save", label: "Save and generate", value: "save and generate" },
      { id: "confirm-change", label: "Change something", value: "change" },
    ];
  }

  if (draft.templateCreationPhase === "choose_method") {
    return [
      { id: "tpl-guided", label: "Guided editor", value: "guided" },
      { id: "tpl-describe", label: "Describe in chat", value: "describe" },
    ];
  }

  const field = draft.editingFieldId ?? getActiveField(draft);

  switch (field) {
    case "generationType":
      return [
        { id: "type-single", label: "Single", value: "single" },
        { id: "type-multi", label: "Multiproduct", value: "multiproduct" },
      ];
    case "template": {
      const options = templatesForType(draft.generationType);
      const choices = options.slice(0, 4).map((t, i) => ({
        id: `tpl-${i}`,
        label: t.name,
        value: t.name,
      }));
      choices.push({ id: "tpl-create", label: "Create template", value: "create template" });
      return choices;
    }
    case "language":
      return OUTPUT_LANGUAGES.slice(0, 5).map((lang) => ({
        id: `lang-${lang}`,
        label: lang,
        value: lang,
      }));
    case "maxLength":
      return [
        ...OUTPUT_LENGTHS.map((l) => ({
          id: `len-${l.id}`,
          label: l.label,
          value: l.label,
        })),
        { id: "len-none", label: "No preference", value: "no preference" },
      ];
    case "glossaries":
      return [
        ...MOCK_GLOSSARIES.slice(0, 4).map((g) => ({
          id: `gl-${g.id}`,
          label: g.name,
          value: g.name,
        })),
        { id: "gl-none", label: "None", value: "none" },
      ];
    case "styleGuide": {
      const guides = loadStyleGuides();
      return [
        ...guides.map((g, i) => ({
          id: `sg-${i}`,
          label: g.name.length > 28 ? `${g.name.slice(0, 26)}…` : g.name,
          value: g.name,
        })),
        { id: "sg-none", label: "None", value: "none" },
        { id: "sg-done", label: "Done selecting", value: "done selecting" },
      ];
    }
    case "referenceContent":
      return [
        ...REFERENCE_DOCUMENTS.map((ref) => ({
          id: `ref-${ref.id}`,
          label: ref.label,
          value: ref.label,
        })),
        { id: "ref-none", label: "None", value: "none" },
        { id: "ref-done", label: "Done selecting", value: "done selecting" },
      ];
    default:
      return [];
  }
}

function withChoices(draft: AiGenerationDraft, message: ChatMessage): ChatMessage {
  const choices = getChoicesForDraft(draft);
  return choices.length > 0 ? { ...message, choices } : message;
}

export function beginFieldEdit(draft: AiGenerationDraft, fieldId: WorkflowFieldId): AgentTurnResult {
  const cleared = clearFieldValue(
    { ...draft, editingFieldId: fieldId, awaitingStepSelection: false },
    fieldId,
  );
  const currentValue = getFieldDisplayValue(draft, fieldId);
  const label =
    fieldId === "generationType"
      ? "Generation type"
      : fieldId === "input"
        ? "Context input"
        : fieldId.charAt(0).toUpperCase() + fieldId.slice(1);
  const reply =
    currentValue !== "Not set"
      ? `**${label}** is currently: *${currentValue}*. How would you like to change it?`
      : promptForField(fieldId, cleared);

  return {
    draft: cleared,
    reply,
    messagesToAppend: [withChoices(cleared, assistantMessage(reply))],
  };
}

function tryMatchProfileOnFirstTurn(
  text: string,
  profiles: SavedProfile[],
): AgentTurnResult | null {
  const match = findProbableProfile(text, profiles);
  if (!match) return null;

  const nextDraft = draftFromSavedProfile(match);
  const reply = buildProfileConfirmationSummary(nextDraft);
  return {
    draft: nextDraft,
    reply,
    messagesToAppend: [
      withChoices(nextDraft, assistantMessage(reply, { kind: "profile-confirmation" })),
    ],
  };
}

function handleSaveProfilePhase(draft: AiGenerationDraft, text: string): AgentTurnResult | null {
  if (draft.saveProfilePhase === "ask") {
    if (AFFIRMATIVE.test(text)) {
      const reply =
        "What should we name this profile? It will appear on the **Generate** page in Manual mode.";
      const next = { ...draft, saveProfilePhase: "name" as const };
      return {
        draft: next,
        reply,
        messagesToAppend: [assistantMessage(reply)],
      };
    }
    if (NEGATIVE.test(text)) {
      return {
        draft: { ...draft, saveProfilePhase: null },
        reply: "No problem — your generation is saved to history.",
        messagesToAppend: [assistantMessage("No problem — your generation is saved to history.")],
        closeChat: true,
      };
    }
    return null;
  }

  if (draft.saveProfilePhase === "name" && !text.trim()) {
    const reply = "Please enter a name for this profile.";
    return {
      draft,
      reply,
      messagesToAppend: [assistantMessage(reply)],
    };
  }

  if (draft.saveProfilePhase === "name" && text.trim()) {
    if (draft.saveProfileBeforeGeneration) {
      return {
        draft: { ...draft, saveProfilePhase: null, saveProfileBeforeGeneration: false },
        reply: `Profile **${text.trim()}** saved. Starting generation…`,
        messagesToAppend: [
          assistantMessage(`Profile **${text.trim()}** saved. Starting generation…`),
        ],
        saveProfileName: text.trim(),
        startGeneration: true,
      };
    }

    return {
      draft: { ...draft, saveProfilePhase: null },
      reply: `Profile **${text.trim()}** saved. You can find it on the Generate page in Manual mode.`,
      messagesToAppend: [
        assistantMessage(
          `Profile **${text.trim()}** saved. You can find it on the Generate page in Manual mode.`,
        ),
      ],
      saveProfileName: text.trim(),
      closeChat: true,
    };
  }

  return null;
}

export function toggleDraftSelection(
  draft: AiGenerationDraft,
  fieldId: WorkflowFieldId,
  value: string,
): AiGenerationDraft {
  return toggleMultiSelectValue(draft, fieldId, value);
}

export function getWorkflowPrompt(field: WorkflowFieldId, draft: AiGenerationDraft): string {
  return promptForField(field, draft);
}

export function processAgentTurn(
  draft: AiGenerationDraft,
  userText: string,
  uploadedFiles: File[],
  options: ProcessAgentOptions = {},
): AgentTurnResult {
  const text = userText.trim();
  let nextDraft = { ...draft };

  const savePhase = handleSaveProfilePhase(nextDraft, text);
  if (savePhase) return savePhase;

  if (options.isFirstTurn && text && options.profiles?.length) {
    const profileMatch = tryMatchProfileOnFirstTurn(text, options.profiles);
    if (profileMatch) return profileMatch;
  }

  if (nextDraft.awaitingProfileConfirmation) {
    if (AFFIRMATIVE.test(text)) {
      nextDraft = { ...nextDraft, awaitingProfileConfirmation: false, editingFieldId: null };
      const active = getActiveField(nextDraft);
      const reply = `Great — settings confirmed. ${promptForField(active, nextDraft)}`;
      return {
        draft: nextDraft,
        reply,
        messagesToAppend: [withChoices(nextDraft, assistantMessage(reply))],
      };
    }
    if (wantsToPickStepToEdit(text)) {
      return beginStepSelection({ ...nextDraft, awaitingProfileConfirmation: false });
    }
    if (isCorrectionMessage(text)) {
      nextDraft = { ...nextDraft, awaitingProfileConfirmation: false, editingFieldId: null };
      nextDraft = applyCorrections(nextDraft, text);
      const active = getActiveField(nextDraft);
      const reply = `Updated. ${promptForField(active, nextDraft)}`;
      return {
        draft: nextDraft,
        reply,
        messagesToAppend: [withChoices(nextDraft, assistantMessage(reply))],
      };
    }
    const reply = buildProfileConfirmationSummary(nextDraft);
    return {
      draft: nextDraft,
      reply,
      messagesToAppend: [
        withChoices(nextDraft, assistantMessage(reply, { kind: "profile-confirmation" })),
      ],
    };
  }

  if (draft.awaitingConfirmation) {
    if (SAVE_AND_GENERATE.test(text)) {
      const next = {
        ...nextDraft,
        awaitingConfirmation: false,
        saveProfilePhase: "name" as const,
        saveProfileBeforeGeneration: true,
      };
      const reply =
        "What should we name this profile? It will appear on the **Generate** page in Manual mode.";
      return {
        draft: next,
        reply,
        messagesToAppend: [assistantMessage(reply)],
      };
    }
    if (AFFIRMATIVE.test(text)) {
      return { draft: nextDraft, reply: "", messagesToAppend: [], startGeneration: true };
    }
    if (wantsToPickStepToEdit(text)) {
      return beginStepSelection(nextDraft);
    }
    if (isCorrectionMessage(text)) {
      nextDraft = applyCorrections(nextDraft, text);
      nextDraft.awaitingConfirmation = false;
      const active = getActiveField(nextDraft);
      const reply = `Updated. ${promptForField(active, nextDraft)}`;
      return {
        draft: nextDraft,
        reply,
        messagesToAppend: [withChoices(nextDraft, assistantMessage(reply))],
      };
    }
    const reply =
      "Reply **yes** to start generation, choose **Save and generate**, click **Change something**, or tell me what to adjust.";
    return {
      draft: nextDraft,
      reply,
      messagesToAppend: [
        withChoices(nextDraft, assistantMessage(reply, { kind: "confirmation" })),
      ],
    };
  }

  if (isCorrectionMessage(text)) {
    nextDraft = applyCorrections(nextDraft, text);
  }

  const templatePhase = handleTemplateCreationPhase(nextDraft, text);
  if (templatePhase) {
    const phaseDraft = templatePhase.draft;
    return {
      draft: phaseDraft,
      reply: templatePhase.reply,
      messagesToAppend: [withChoices(phaseDraft, assistantMessage(templatePhase.reply))],
      openTemplateWizard: templatePhase.openTemplateWizard,
    };
  }

  const activeBefore = getActiveField(nextDraft);

  if (DONE_SELECTING.test(text) && isMultiSelectField(activeBefore)) {
    if (
      activeBefore === "styleGuide" &&
      !nextDraft.styleGuideSkipped &&
      nextDraft.styleGuideNames.length === 0 &&
      nextDraft.styleGuideMode !== "custom"
    ) {
      const hint = "Select at least one style guide, choose **None**, or type custom instructions.";
      return {
        draft: nextDraft,
        reply: hint,
        messagesToAppend: [withChoices(nextDraft, assistantMessage(hint))],
      };
    }
    if (
      activeBefore === "referenceContent" &&
      !nextDraft.referenceContentSkipped &&
      nextDraft.referenceContentNames.length === 0
    ) {
      const hint = "Select at least one reference document from Brand Voice, or choose **None**.";
      return {
        draft: nextDraft,
        reply: hint,
        messagesToAppend: [withChoices(nextDraft, assistantMessage(hint))],
      };
    }
  }

  nextDraft = applyFieldInput(nextDraft, activeBefore, text, uploadedFiles);

  if (nextDraft.templateCreationPhase === "choose_method") {
    const reply = promptTemplateCreationChoice();
    return {
      draft: nextDraft,
      reply,
      messagesToAppend: [withChoices(nextDraft, assistantMessage(reply))],
    };
  }

  if (!isFieldComplete(nextDraft, activeBefore) && text) {
    const hint = `I didn't catch that. ${promptForField(activeBefore, nextDraft)}`;
    return {
      draft: nextDraft,
      reply: hint,
      messagesToAppend: [withChoices(nextDraft, assistantMessage(hint))],
    };
  }

  if (isDraftReadyForConfirmation(nextDraft) && !nextDraft.awaitingConfirmation) {
    nextDraft.awaitingConfirmation = true;
    const reply = buildConfirmationSummary(nextDraft);
    return {
      draft: nextDraft,
      reply,
      messagesToAppend: [
        withChoices(nextDraft, assistantMessage(reply, { kind: "confirmation" })),
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
        withChoices(nextDraft, assistantMessage(reply, { kind: "confirmation" })),
      ],
    };
  }

  const reply = promptForField(active, nextDraft);
  return {
    draft: nextDraft,
    reply,
    messagesToAppend: [withChoices(nextDraft, assistantMessage(reply))],
  };
}

export function shouldStartGeneration(draft: AiGenerationDraft, userText: string): boolean {
  return (
    draft.awaitingConfirmation &&
    !draft.awaitingProfileConfirmation &&
    AFFIRMATIVE.test(userText.trim())
  );
}

export function startSaveProfilePrompt(draft: AiGenerationDraft): AgentTurnResult {
  const next = { ...draft, saveProfilePhase: "ask" as const };
  const reply = "Would you like to save these settings as a profile for **Manual → Generate**?";
  return {
    draft: next,
    reply,
    messagesToAppend: [withChoices(next, assistantMessage(reply))],
  };
}
