import type { ProfileType, SavedProfile } from "./profiles";
import type { User } from "./session";
import {
  OUTPUT_LENGTHS,
  PRODUCT_TEMPLATES,
  SINGLE_TEMPLATES,
  type WizardTemplate,
} from "./wizardConfig";

export type WorkflowFieldId =
  | "input"
  | "generationType"
  | "template"
  | "language"
  | "maxLength"
  | "glossaries"
  | "styleGuide"
  | "referenceContent"
  | "confirm";

export interface WorkflowFieldConfig {
  id: WorkflowFieldId;
  label: string;
  color: string;
  description: string;
}

export const WORKFLOW_FIELDS: WorkflowFieldConfig[] = [
  {
    id: "generationType",
    label: "Generation type",
    color: "#8b5cf6",
    description: "Single output file or multiproduct batch",
  },
  {
    id: "template",
    label: "Template",
    color: "#ec4899",
    description: "Output structure and format",
  },
  {
    id: "language",
    label: "Language",
    color: "#f97316",
    description: "Generation language",
  },
  {
    id: "maxLength",
    label: "Max length",
    color: "#eab308",
    description: "Target length for single-type runs",
  },
  {
    id: "glossaries",
    label: "Glossaries",
    color: "#22c55e",
    description: "Terminology dictionaries for brand voice",
  },
  {
    id: "styleGuide",
    label: "Style guide",
    color: "#06b6d4",
    description: "Tone and writing rules",
  },
  {
    id: "referenceContent",
    label: "Reference content",
    color: "#3b82f6",
    description: "Brand Voice library reference documents",
  },
  {
    id: "input",
    label: "Context input",
    color: "#6366f1",
    description: "Source files or pasted text for generation context",
  },
  {
    id: "confirm",
    label: "Confirm & generate",
    color: "#1b2842",
    description: "Review settings and start",
  },
];

export interface AiGenerationDraft {
  inputFiles: File[];
  /** Text the user typed at the input step (not file extracts). */
  userTypedInput: string;
  inputFileExtracts: Record<string, string>;
  generationType: ProfileType | null;
  template: string | null;
  templateCreationPhase: null | "choose_method" | "llm_building" | "guided_wizard";
  templateLlmDescription: string;
  language: string | null;
  maxLength: string | null;
  glossaryNames: string[];
  glossariesSkipped: boolean;
  styleGuideMode: "existing" | "custom" | "none" | null;
  styleGuideNames: string[];
  styleGuideCustomInstructions: string;
  styleGuideSkipped: boolean;
  referenceContentNames: string[];
  referenceContentSkipped: boolean;
  awaitingConfirmation: boolean;
  /** User chose to change settings — pick a workflow step in the panel. */
  awaitingStepSelection: boolean;
  /** Prefilled from a saved profile — user must confirm settings before input. */
  awaitingProfileConfirmation: boolean;
  matchedProfileId: string | null;
  matchedProfileName: string | null;
  /** User clicked a workflow step to revise it. */
  editingFieldId: WorkflowFieldId | null;
  /** After generation: ask to save profile. */
  saveProfilePhase: null | "ask" | "name";
  /** Naming a profile before generation (Save and generate). */
  saveProfileBeforeGeneration: boolean;
}

export function getCompletedWorkflowFields(draft: AiGenerationDraft): WorkflowFieldConfig[] {
  return WORKFLOW_FIELDS.filter((field) => {
    if (field.id === "confirm") return draft.awaitingConfirmation;
    return isFieldComplete(draft, field.id);
  });
}

export function createEmptyDraft(): AiGenerationDraft {
  return {
    inputFiles: [],
    userTypedInput: "",
    inputFileExtracts: {},
    generationType: null,
    template: null,
    templateCreationPhase: null,
    templateLlmDescription: "",
    language: null,
    maxLength: null,
    glossaryNames: [],
    glossariesSkipped: false,
    styleGuideMode: null,
    styleGuideNames: [],
    styleGuideCustomInstructions: "",
    styleGuideSkipped: false,
    referenceContentNames: [],
    referenceContentSkipped: false,
    awaitingConfirmation: false,
    awaitingStepSelection: false,
    awaitingProfileConfirmation: false,
    matchedProfileId: null,
    matchedProfileName: null,
    editingFieldId: null,
    saveProfilePhase: null,
    saveProfileBeforeGeneration: false,
  };
}

export function templatesForType(type: ProfileType | null): WizardTemplate[] {
  if (type === "multiproduct") return PRODUCT_TEMPLATES;
  if (type === "single") return SINGLE_TEMPLATES;
  return [...SINGLE_TEMPLATES, ...PRODUCT_TEMPLATES];
}

export function isFieldComplete(draft: AiGenerationDraft, fieldId: WorkflowFieldId): boolean {
  switch (fieldId) {
    case "input":
      return draft.inputFiles.length > 0 || draft.userTypedInput.trim().length > 0;
    case "generationType":
      return draft.generationType !== null;
    case "template":
      return draft.template !== null;
    case "language":
      return draft.language !== null;
    case "maxLength":
      return draft.generationType === "multiproduct" || draft.maxLength !== null;
    case "glossaries":
      return draft.glossariesSkipped || draft.glossaryNames.length > 0;
    case "styleGuide":
      if (draft.styleGuideSkipped || draft.styleGuideMode === "none") return true;
      if (draft.styleGuideMode === "existing") return draft.styleGuideNames.length > 0;
      if (draft.styleGuideMode === "custom") return draft.styleGuideCustomInstructions.trim().length > 0;
      return false;
    case "referenceContent":
      return draft.referenceContentSkipped || draft.referenceContentNames.length > 0;
    case "confirm":
      return draft.awaitingConfirmation;
    default:
      return false;
  }
}

export function getActiveField(draft: AiGenerationDraft): WorkflowFieldId {
  if (draft.editingFieldId) return draft.editingFieldId;
  if (draft.awaitingConfirmation || draft.awaitingStepSelection) return "confirm";
  for (const field of WORKFLOW_FIELDS) {
    if (field.id === "confirm") continue;
    if (!isFieldComplete(draft, field.id)) return field.id;
  }
  return "confirm";
}

export function draftFromSavedProfile(profile: SavedProfile): AiGenerationDraft {
  const glossaryNames =
    profile.dictionary && profile.dictionary !== "No dictionary"
      ? profile.dictionary.split(",").map((part) => part.trim()).filter(Boolean)
      : [];

  return {
    ...createEmptyDraft(),
    generationType: profile.type,
    template: profile.template,
    language: profile.language,
    maxLength: profile.type === "multiproduct" ? null : profile.length,
    glossaryNames,
    glossariesSkipped: glossaryNames.length === 0,
    styleGuideMode: profile.styleGuides.length > 0 ? "existing" : "none",
    styleGuideNames: [...profile.styleGuides],
    styleGuideSkipped: profile.styleGuides.length === 0,
    referenceContentNames: [...profile.referenceContent],
    referenceContentSkipped: profile.referenceContent.length === 0,
    matchedProfileId: profile.id,
    matchedProfileName: profile.name,
    awaitingProfileConfirmation: true,
  };
}

export function clearFieldValue(draft: AiGenerationDraft, fieldId: WorkflowFieldId): AiGenerationDraft {
  const next = {
    ...draft,
    awaitingConfirmation: false,
    awaitingProfileConfirmation: false,
    awaitingStepSelection: false,
  };

  switch (fieldId) {
    case "input":
      return {
        ...next,
        inputFiles: [],
        userTypedInput: "",
        inputFileExtracts: {},
      };
    case "generationType":
      return { ...next, generationType: null };
    case "template":
      return {
        ...next,
        template: null,
        templateCreationPhase: null,
        templateLlmDescription: "",
      };
    case "language":
      return { ...next, language: null };
    case "maxLength":
      return { ...next, maxLength: null };
    case "glossaries":
      return { ...next, glossaryNames: [], glossariesSkipped: false };
    case "styleGuide":
      return {
        ...next,
        styleGuideMode: null,
        styleGuideNames: [],
        styleGuideCustomInstructions: "",
        styleGuideSkipped: false,
      };
    case "referenceContent":
      return { ...next, referenceContentNames: [], referenceContentSkipped: false };
    default:
      return next;
  }
}

export function isSettingsComplete(draft: AiGenerationDraft): boolean {
  return WORKFLOW_FIELDS.filter((f) => f.id !== "confirm" && f.id !== "input").every((f) =>
    isFieldComplete(draft, f.id),
  );
}

export function isDraftReadyForConfirmation(draft: AiGenerationDraft): boolean {
  return WORKFLOW_FIELDS.filter((f) => f.id !== "confirm").every((f) =>
    isFieldComplete(draft, f.id),
  );
}

export function getFieldDisplayValue(draft: AiGenerationDraft, fieldId: WorkflowFieldId): string {
  switch (fieldId) {
    case "input":
      if (draft.inputFiles.length > 0) {
        return draft.inputFiles.map((f) => f.name).join(", ");
      }
      if (draft.userTypedInput.trim()) {
        return "Typed input";
      }
      return "Not set";
    case "generationType":
      if (draft.generationType === "single") return "Single — one output file";
      if (draft.generationType === "multiproduct") return "Multiproduct — batch per item";
      return "Not set";
    case "template":
      return draft.template ?? "Not set";
    case "language":
      return draft.language ?? "Not set";
    case "maxLength":
      if (draft.generationType === "multiproduct") return "N/A (multiproduct)";
      return draft.maxLength ?? "Not set";
    case "glossaries":
      if (draft.glossariesSkipped) return "None";
      return draft.glossaryNames.length > 0 ? draft.glossaryNames.join(", ") : "Not set";
    case "styleGuide":
      if (draft.styleGuideSkipped || draft.styleGuideMode === "none") return "None";
      if (draft.styleGuideMode === "existing") {
        return draft.styleGuideNames.length > 0 ? draft.styleGuideNames.join(", ") : "Not set";
      }
      if (draft.styleGuideMode === "custom") {
        const snippet = draft.styleGuideCustomInstructions.trim().slice(0, 40);
        return snippet ? `Custom: ${snippet}${draft.styleGuideCustomInstructions.length > 40 ? "…" : ""}` : "Not set";
      }
      return "Not set";
    case "referenceContent":
      if (draft.referenceContentSkipped) return "None";
      return draft.referenceContentNames.length > 0
        ? draft.referenceContentNames.join(", ")
        : "Not set";
    case "confirm":
      return draft.awaitingConfirmation ? "Ready to start" : "Pending";
    default:
      return "Not set";
  }
}

export function draftToSavedProfile(
  draft: AiGenerationDraft,
  user: User,
  profileName?: string,
): SavedProfile {
  const now = new Date();
  const styleGuides =
    draft.styleGuideMode === "existing" && draft.styleGuideNames.length > 0
      ? draft.styleGuideNames
      : draft.styleGuideMode === "custom"
        ? [`${user.name} — custom instructions`]
        : [];

  return {
    id: `profile-${Date.now()}`,
    name:
      profileName?.trim() ||
      draft.matchedProfileName ||
      `AI Generation · ${new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(now)}`,
    type: draft.generationType ?? "single",
    createdBy: user.name,
    createdAt: new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(now),
    template: draft.template ?? "Product Description",
    language: draft.language ?? "English",
    length: draft.maxLength ?? OUTPUT_LENGTHS[1].label,
    dictionary:
      draft.glossaryNames.length > 0 ? draft.glossaryNames.join(", ") : "No dictionary",
    styleGuides,
    referenceContent: draft.referenceContentSkipped ? [] : draft.referenceContentNames,
  };
}

export function getInputSummary(draft: AiGenerationDraft) {
  return {
    fileNames: draft.inputFiles.map((f) => f.name),
    typedText: draft.userTypedInput.trim(),
  };
}

export function buildGenerationSource(draft: AiGenerationDraft): string {
  const parts: string[] = [];
  if (draft.userTypedInput.trim()) parts.push(draft.userTypedInput.trim());

  for (const file of draft.inputFiles) {
    const extracted = draft.inputFileExtracts[file.name];
    if (extracted) {
      parts.push(`\n--- ${file.name} ---\n${extracted}`);
    } else {
      parts.push(`Uploaded input file: ${file.name}`);
    }
  }

  return parts.join("\n\n").trim();
}

export const MULTI_SELECT_WORKFLOW_FIELDS: WorkflowFieldId[] = ["styleGuide", "referenceContent"];

export function isMultiSelectField(fieldId: WorkflowFieldId): boolean {
  return MULTI_SELECT_WORKFLOW_FIELDS.includes(fieldId);
}

export function getSelectedValuesForField(draft: AiGenerationDraft, fieldId: WorkflowFieldId): string[] {
  if (fieldId === "styleGuide") return draft.styleGuideNames;
  if (fieldId === "referenceContent") return draft.referenceContentNames;
  return [];
}

export function toggleMultiSelectValue(
  draft: AiGenerationDraft,
  fieldId: WorkflowFieldId,
  value: string,
): AiGenerationDraft {
  if (fieldId === "styleGuide") {
    if (value === "none") {
      return {
        ...draft,
        styleGuideSkipped: true,
        styleGuideMode: "none",
        styleGuideNames: [],
        styleGuideCustomInstructions: "",
      };
    }
    const set = new Set(draft.styleGuideNames);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return {
      ...draft,
      styleGuideSkipped: false,
      styleGuideMode: "existing",
      styleGuideNames: [...set],
      styleGuideCustomInstructions: "",
    };
  }

  if (fieldId === "referenceContent") {
    if (value === "none") {
      return { ...draft, referenceContentSkipped: true, referenceContentNames: [] };
    }
    const set = new Set(draft.referenceContentNames);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return {
      ...draft,
      referenceContentSkipped: false,
      referenceContentNames: [...set],
    };
  }

  return draft;
}
