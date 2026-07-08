import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "../data/session";
import { IconPaperclip, IconSend } from "./Icons";
import { AiWorkflowPanel } from "./ai/AiWorkflowPanel";
import { AiConfirmationSummary } from "./ai/AiConfirmationSummary";
import { AiChoiceButtons } from "./ai/AiChoiceButtons";
import { AiSneakersAnimation } from "./ai/AiSneakersAnimation";
import {
  GenerationEditor,
  type GenerationEditorCloseResult,
} from "./GenerationEditor";
import { GenerationCommitModal } from "./GenerationCommitModal";
import {
  type AiGenerationDraft,
  type WorkflowFieldId,
  buildGenerationSource,
  createEmptyDraft,
  draftToSavedProfile,
  getActiveField,
  getSelectedValuesForField,
  isMultiSelectField,
} from "../data/aiGenerationWorkflow";
import { loadProfiles, saveProfiles } from "../data/profiles";
import { buildGenerationOutput, type GenerationOutput } from "../data/generationOutput";
import type { SavedProfile } from "../data/profiles";
import {
  appendHistoryRecord,
  createHistoryRecordFromGeneration,
} from "../data/historyStore";
import { appendInstructionsToUserStyleGuide, appendStyleGuide } from "../data/styleGuidesStore";
import { CreateTemplateWizard } from "./CreateTemplateWizard";
import type { TemplateInputType, TemplateWorkflowType } from "../data/templatesLibrary";
import {
  processAgentTurn,
  shouldStartGeneration,
  getWorkflowPrompt,
  beginFieldEdit,
  startSaveProfilePrompt,
  toggleDraftSelection,
  type ChatMessage,
} from "../data/aiGenerationAgent";
import { ACCEPTED_FILE_TYPES } from "../data/wizardConfig";
import { validateUploadFile } from "../utils/wizardUtils";
import { extractInputFileText } from "../utils/inputFileUtils";
import { getTimeGreeting } from "../utils/greeting";

type AiPhase = "intake" | "generating" | "editing";

interface AiGenerationChatProps {
  user: User;
  chatKey: number;
}

const GENERATION_DELAY_MS = 20_000;

export function AiGenerationChat({ user, chatKey }: AiGenerationChatProps) {
  const [phase, setPhase] = useState<AiPhase>("intake");
  const [chatStarted, setChatStarted] = useState(false);
  const [draft, setDraft] = useState<AiGenerationDraft>(() => createEmptyDraft());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [runningProfile, setRunningProfile] = useState<SavedProfile | null>(null);
  const [editorOutput, setEditorOutput] = useState<GenerationOutput | null>(null);
  const [pendingEditorClose, setPendingEditorClose] = useState<GenerationEditorCloseResult | null>(
    null,
  );
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showTemplateWizard, setShowTemplateWizard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastGenerationDraftRef = useRef<AiGenerationDraft | null>(null);
  const greeting = getTimeGreeting(user.name);
  const activeField = getActiveField(draft);
  const attachProminent = isAttachProminent(draft, chatStarted);

  useEffect(() => {
    setPhase("intake");
    setChatStarted(false);
    setDraft(createEmptyDraft());
    setMessages([]);
    setInput("");
    setRunningProfile(null);
    setEditorOutput(null);
    setPendingEditorClose(null);
    setShowCommitModal(false);
    setShowTemplateWizard(false);
  }, [chatKey, user.name]);

  useEffect(() => {
    if (!chatStarted) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase, chatStarted]);

  const appendUserMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: text.trim() }]);
  };

  const appendAssistantMessages = (items: ChatMessage[]) => {
    if (items.length === 0) return;
    setMessages((prev) => [...prev, ...items]);
  };

  const beginChat = () => {
    if (!chatStarted) setChatStarted(true);
  };

  const resetChat = () => {
    setChatStarted(false);
    setDraft(createEmptyDraft());
    setMessages([]);
    setInput("");
    lastGenerationDraftRef.current = null;
  };

  const applyAgentResult = (
    result: ReturnType<typeof processAgentTurn>,
    isFirstTurn: boolean,
  ) => {
    setDraft(result.draft);

    if (result.openTemplateWizard) {
      setShowTemplateWizard(true);
    }

    if (result.startGeneration) {
      if (result.saveProfileName) {
        const profile = draftToSavedProfile(result.draft, user, result.saveProfileName);
        saveProfiles([profile, ...loadProfiles()]);
      }
      appendAssistantMessages(result.messagesToAppend);
      startGeneration(result.draft);
      return;
    }

    if (result.saveProfileName) {
      const profile = draftToSavedProfile(result.draft, user, result.saveProfileName);
      saveProfiles([profile, ...loadProfiles()]);
      appendAssistantMessages(result.messagesToAppend);
      resetChat();
      return;
    }

    if (result.closeChat) {
      appendAssistantMessages(result.messagesToAppend);
      resetChat();
      return;
    }

    if (result.messagesToAppend.length > 0) {
      const [first, ...rest] = result.messagesToAppend;
      const hello = isFirstTurn ? `Hi ${user.name.split(" ")[0]}! ` : "";
      appendAssistantMessages([{ ...first, text: `${hello}${first.text}` }, ...rest]);
      return;
    }

    if (result.reply) {
      const hello = isFirstTurn ? `Hi ${user.name.split(" ")[0]}! ` : "";
      appendAssistantMessages([
        { id: `a-${Date.now()}`, role: "assistant", text: `${hello}${result.reply}` },
      ]);
    }
  };

  const runAgentTurn = (
    text: string,
    files: File[],
    isFirstTurn: boolean,
    draftOverride?: AiGenerationDraft,
  ) => {
    const baseDraft = draftOverride ?? draft;

    if (shouldStartGeneration(baseDraft, text)) {
      startGeneration(baseDraft);
      return;
    }

    const result = processAgentTurn(baseDraft, text, files, {
      isFirstTurn,
      profiles: loadProfiles(),
    });
    applyAgentResult(result, isFirstTurn);
  };

  const submitChoice = (value: string, label: string) => {
    if (busy || phase !== "intake") return;

    const field = draft.editingFieldId ?? getActiveField(draft);
    const isToggle =
      isMultiSelectField(field) && value !== "none" && value !== "done selecting";

    if (isToggle) {
      appendUserMessage(label);
      setDraft((current) => toggleDraftSelection(current, field, value));
      return;
    }

    setBusy(true);
    appendUserMessage(label);
    runAgentTurn(value, [], false);
    setBusy(false);
  };

  const handleStepClick = (fieldId: WorkflowFieldId) => {
    if (busy || phase !== "intake" || fieldId === "confirm") return;
    const baseDraft = draft.awaitingStepSelection
      ? { ...draft, awaitingStepSelection: false }
      : draft;
    const result = beginFieldEdit(baseDraft, fieldId);
    setDraft(result.draft);
    appendAssistantMessages(result.messagesToAppend);
  };

  const enrichDraftWithFiles = async (
    current: AiGenerationDraft,
    files: File[],
  ): Promise<AiGenerationDraft> => {
    let next = { ...current };
    for (const file of files) {
      if (next.inputFiles.some((f) => f.name === file.name && f.size === file.size)) continue;
      let extracted = `[File: ${file.name}]`;
      try {
        extracted = await extractInputFileText(file);
      } catch {
        /* keep fallback */
      }
      next = {
        ...next,
        inputFiles: [...next.inputFiles, file],
        inputFileExtracts: { ...next.inputFileExtracts, [file.name]: extracted },
      };
    }
    return next;
  };

  const startGeneration = (finalDraft: AiGenerationDraft) => {
    lastGenerationDraftRef.current = finalDraft;
    const profile = draftToSavedProfile(finalDraft, user);
    setRunningProfile(profile);

    if (finalDraft.styleGuideMode === "custom" && finalDraft.styleGuideCustomInstructions.trim() && !finalDraft.styleGuideSkipped) {
      appendStyleGuide({
        id: `sg-ai-${Date.now()}`,
        name: `${user.name} — chat instructions`,
        content: `# Custom style instructions\n\n${finalDraft.styleGuideCustomInstructions.trim()}`,
        usageCount: 0,
        label: "Style guide",
        uploadedAt: new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date()),
        createdBy: user.name,
        userId: user.userId,
        isUserGuide: true,
      });
    }

    setPhase("generating");
    window.setTimeout(() => {
      const source = buildGenerationSource(finalDraft);
      const output = buildGenerationOutput(profile, source);
      setEditorOutput(output);
      setPhase("editing");
    }, GENERATION_DELAY_MS);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || phase !== "intake") return;

    const text = input.trim();
    if (!text) return;

    const isFirstTurn = !chatStarted;
    setBusy(true);
    beginChat();
    appendUserMessage(text);
    setInput("");

    if (shouldStartGeneration(draft, text)) {
      startGeneration(draft);
      setBusy(false);
      return;
    }

    runAgentTurn(text, [], isFirstTurn);
    setBusy(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || phase !== "intake") return;

    const accepted: File[] = [];
    const errors: string[] = [];
    for (const file of files) {
      const error = validateUploadFile(file);
      if (error) errors.push(`${file.name}: ${error}`);
      else accepted.push(file);
    }

    if (errors.length > 0) {
      beginChat();
      appendAssistantMessages([
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: `Some files were rejected:\n${errors.join("\n")}`,
        },
      ]);
    }

    if (accepted.length === 0) return;

    const names = accepted.map((f) => f.name).join(", ");
    const isFirstTurn = !chatStarted;
    beginChat();
    appendUserMessage(`Uploaded: ${names}`);
    setBusy(true);

    const enriched = await enrichDraftWithFiles(draft, accepted);
    setDraft(enriched);
    setBusy(false);

    const active = getActiveField(enriched);
    const applyFiles = active === "input";

    if (!applyFiles) {
      appendAssistantMessages([
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: `I've saved your files (${names}). ${getWorkflowPrompt(active, enriched)}`,
        },
      ]);
      return;
    }

    runAgentTurn("", [], isFirstTurn, enriched);
  };

  const finishToHistory = (profile: SavedProfile) => {
    appendHistoryRecord(
      createHistoryRecordFromGeneration({
        profileName: profile.name,
        templateName: profile.template,
        type: profile.type,
        createdBy: user.name,
      }),
    );
    setRunningProfile(null);
    setEditorOutput(null);
    setPendingEditorClose(null);
    setShowCommitModal(false);
    setPhase("intake");

    const savedDraft = lastGenerationDraftRef.current;
    if (savedDraft) {
      const result = startSaveProfilePrompt(savedDraft);
      setDraft(result.draft);
      setChatStarted(true);
      appendAssistantMessages(result.messagesToAppend);
      return;
    }

    resetChat();
  };

  const handleEditorCloseRequest = (result: GenerationEditorCloseResult) => {
    if (!runningProfile) return;

    if (result.committedInstructions.length > 0) {
      setPendingEditorClose(result);
      setShowCommitModal(true);
      return;
    }

    finishToHistory(runningProfile);
  };

  const handleCommitStyleGuide = (
    editedInstructions: GenerationEditorCloseResult["committedInstructions"],
  ) => {
    if (!runningProfile || !pendingEditorClose) return;

    appendInstructionsToUserStyleGuide({
      userId: user.userId,
      userName: user.name,
      instructions: editedInstructions.map((item) => ({
        summary: item.summary,
        sourcePrompt: item.sourcePrompt,
      })),
      context: {
        template: runningProfile.template,
        language: runningProfile.language,
      },
    });

    finishToHistory(runningProfile);
  };

  if (phase === "generating") {
    return (
      <div className="ai-generation-layout ai-generation-layout--generating" key={chatKey}>
        <AiSneakersAnimation />
      </div>
    );
  }

  if (phase === "editing" && runningProfile && editorOutput) {
    return (
      <div className="ai-generation-editor-wrap" key={chatKey}>
        <GenerationEditor
          profile={runningProfile}
          initialOutput={editorOutput}
          onRequestClose={handleEditorCloseRequest}
        />
        {showCommitModal && pendingEditorClose && (
          <GenerationCommitModal
            instructions={pendingEditorClose.committedInstructions}
            userName={user.name}
            onCancel={() => {
              setShowCommitModal(false);
              setPendingEditorClose(null);
            }}
            onCloseWithoutCommitting={() => finishToHistory(runningProfile)}
            onCommit={handleCommitStyleGuide}
          />
        )}
      </div>
    );
  }

  if (!chatStarted) {
    return (
      <div className="home-chat" key={chatKey}>
        <div className="home-chat-welcome">
          <h1 className="home-chat-greeting">{greeting}</h1>
        </div>

        <form className="home-chat-composer" onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            className="upload-input-hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="home-chat-input-wrap">
            <AttachFileButton
              prominent={attachProminent}
              onClick={() => fileInputRef.current?.click()}
              title={attachProminent ? "Attach source files" : "Attach files"}
            />
            <textarea
              className="home-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What do you want to generate today?"
              rows={1}
              aria-label="Message"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              className="home-chat-send"
              aria-label="Send message"
              disabled={!input.trim() || busy}
            >
              <IconSend size={18} />
            </button>
          </div>
          <p className="home-chat-hint">
            {attachProminent
              ? "Attach files with the clip · Press Enter to send · Shift+Enter for a new line"
              : "Press Enter to send · Shift+Enter for a new line"}
          </p>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="ai-generation-layout" key={chatKey}>
      <AiWorkflowPanel
        draft={draft}
        activeFieldId={activeField}
        onStepClick={handleStepClick}
      />

      <section className="ai-generation-chat">
        <div className="ai-generation-messages" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-generation-message ai-generation-message--${msg.role}`}
            >
              <div className="ai-generation-message-bubble">
                {formatMessage(msg.text)}
                {msg.kind === "confirmation" && <AiConfirmationSummary draft={draft} />}
                {msg.kind === "profile-confirmation" && (
                  <AiConfirmationSummary draft={draft} excludeInput />
                )}
                {msg.choices && msg.choices.length > 0 && (
                  <AiChoiceButtons
                    choices={msg.choices}
                    disabled={busy}
                    multiSelect={isMultiSelectField(activeField)}
                    selectedValues={getSelectedValuesForField(draft, activeField)}
                    onSelect={(value) => {
                      const choice = msg.choices?.find((c) => c.value === value);
                      submitChoice(value, choice?.label ?? value);
                    }}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="ai-generation-composer" onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            className="upload-input-hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="home-chat-input-wrap ai-generation-input-wrap">
            <AttachFileButton
              prominent={attachProminent}
              onClick={() => fileInputRef.current?.click()}
              title={attachProminent ? "Attach context input files" : "Attach files"}
            />
            <textarea
              className="home-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chat with the agent — correct any workflow step…"
              rows={2}
              aria-label="Message"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              className="home-chat-send"
              aria-label="Send message"
              disabled={!input.trim() || busy}
            >
              <IconSend size={18} />
            </button>
          </div>
          <p className="home-chat-hint">
            {attachProminent
              ? "Attach files with the clip · Press Enter to send · Shift+Enter for a new line"
              : "Press Enter to send · Shift+Enter for a new line"}
          </p>
        </form>
      </section>
      </div>

      {showTemplateWizard && (
        <div className="glossary-editor-backdrop ai-template-wizard-backdrop" role="presentation">
          <div
            className="ai-template-wizard-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Create template"
            onClick={(e) => e.stopPropagation()}
          >
            <CreateTemplateWizard
              variant="modal"
              cancelLabel="Back to chat"
              inheritedInputType={templateWizardInputType(draft)}
              inheritedWorkflowType={templateWizardWorkflowType(draft)}
              onCancel={() => {
                setShowTemplateWizard(false);
                setDraft((current) => ({ ...current, templateCreationPhase: "choose_method" }));
              }}
              onComplete={({ template }) => {
                setShowTemplateWizard(false);
                setDraft((current) => {
                  const next = {
                    ...current,
                    template: template.name,
                    templateCreationPhase: null,
                  };
                  const active = getActiveField(next);
                  appendAssistantMessages([
                    {
                      id: `a-${Date.now()}`,
                      role: "assistant",
                      text: `Template **${template.name}** saved. ${getWorkflowPrompt(active, next)}`,
                    },
                  ]);
                  return next;
                });
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function isAttachProminent(draft: AiGenerationDraft, chatStarted: boolean): boolean {
  if (!chatStarted) return false;
  const field = getActiveField(draft);
  return field === "input" || field === "template" || draft.templateCreationPhase !== null;
}

function AttachFileButton({
  prominent,
  onClick,
  title,
}: {
  prominent: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      className={`ai-generation-attach${prominent ? " ai-generation-attach--prominent" : ""}`}
      aria-label="Attach file"
      onClick={onClick}
      title={title}
    >
      <IconPaperclip size={prominent ? 20 : 16} />
    </button>
  );
}

function templateWizardWorkflowType(draft: AiGenerationDraft): TemplateWorkflowType | undefined {
  if (draft.generationType === "multiproduct") return "MULTI";
  if (draft.generationType === "single") return "SINGLE";
  return undefined;
}

function templateWizardInputType(draft: AiGenerationDraft): TemplateInputType | undefined {
  if (draft.inputFiles.length > 0 || draft.generationType === "multiproduct") return "FILE";
  if (draft.userTypedInput.trim()) return "TEXT";
  if (draft.generationType === "single") return "TEXT";
  return undefined;
}

function formatMessage(text: string) {
  return text.split("\n").map((line, index, lines) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return (
      <span key={index}>
        {parts}
        {index < lines.length - 1 && <br />}
      </span>
    );
  });
}
