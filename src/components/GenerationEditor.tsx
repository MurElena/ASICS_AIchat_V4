import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractStyleInstructions,
  regenerateSectionWithLlm,
  reviewGenerationWithLlm,
} from "../api/generationEdit";
import {
  demoApplyTextRevisionToExcelCells,
  serializeExcelCells,
  type GenerationOutput,
} from "../data/generationOutput";
import type { SavedProfile } from "../data/profiles";
import { cellKey, type TemplateCell } from "../utils/templateCellFormat";
import { cellsToExcelBlob } from "../utils/templateFileUtils";
import { ExcelGridEditor } from "./template-editor/ExcelGridEditor";
import { IconSend } from "./Icons";

export interface CommittedInstruction {
  id: string;
  summary: string;
  sourcePrompt: string;
}

export interface GenerationEditorCloseResult {
  committedInstructions: CommittedInstruction[];
  finalOutput: GenerationOutput;
  savedStyleGuide: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface GenerationEditorProps {
  profile: SavedProfile;
  initialOutput: GenerationOutput;
  onRequestClose: (draft: GenerationEditorCloseResult) => void;
}

export function GenerationEditor({
  profile,
  initialOutput,
  onRequestClose,
}: GenerationEditorProps) {
  const isExcel = initialOutput.format === "excel";
  const [content, setContent] = useState(initialOutput.textContent);
  const [excelCells, setExcelCells] = useState<TemplateCell[]>(initialOutput.excelCells ?? []);
  const [excelActiveKey, setExcelActiveKey] = useState(() => cellKey(0, 0));
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: isExcel
        ? "This generation is an Excel catalog. Edit cells directly, use chat to revise descriptions, or download the workbook."
        : "Ask me to review or revise this generation. Highlight a section in the document to regenerate it topically. Use Commit to style guide to capture writing rules from your last instruction.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sectionBusy, setSectionBusy] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [committedInstructions, setCommittedInstructions] = useState<CommittedInstruction[]>([]);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(
    null,
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState("");

  const documentContent = isExcel ? serializeExcelCells(excelCells) : content;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const updateSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) {
      setSelection(null);
      return;
    }
    setSelection({ start, end, text: content.slice(start, end) });
  }, [content]);

  const buildFinalOutput = (): GenerationOutput => {
    if (isExcel) {
      return {
        format: "excel",
        excelCells,
        textContent: serializeExcelCells(excelCells),
        fileName: initialOutput.fileName ?? "generation.xlsx",
      };
    }
    return {
      format: "text",
      textContent: content,
      fileName: initialOutput.fileName ?? "generation.txt",
    };
  };

  const submitChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;

    setChatError(null);
    setChatBusy(true);
    setLastUserPrompt(text);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setChatInput("");

    try {
      if (isExcel) {
        setExcelCells((prev) => demoApplyTextRevisionToExcelCells(prev, text));
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: "Updated catalog description cells based on your instructions.",
          },
        ]);
      } else {
        const result = await reviewGenerationWithLlm({
          content: documentContent,
          instruction: text,
          profile,
        });
        setContent(result.content);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", text: result.reply },
        ]);
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setChatBusy(false);
    }
  };

  const handleRegenerateSection = async () => {
    if (!selection?.text.trim() || sectionBusy || isExcel) return;

    setSectionBusy(true);
    setChatError(null);
    try {
      const result = await regenerateSectionWithLlm({
        fullContent: content,
        selectedText: selection.text,
        profile,
      });
      const next =
        content.slice(0, selection.start) + result.replacement + content.slice(selection.end);
      setContent(next);
      setSelection(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "Regenerated the highlighted section. Select another passage to revise further.",
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Section regeneration failed.");
    } finally {
      setSectionBusy(false);
    }
  };

  const handleCommitToStyleGuide = async () => {
    const prompt = lastUserPrompt.trim();
    if (!prompt || commitBusy) {
      setChatError("Send an instruction in chat first, then commit it to a style guide.");
      return;
    }

    setCommitBusy(true);
    setChatError(null);
    try {
      const result = await extractStyleInstructions({ userPrompt: prompt, profile });
      const summary = result.instructions.trim();
      if (!summary) {
        setChatError("No style instructions could be extracted from your last message.");
        return;
      }
      setCommittedInstructions((prev) => [
        ...prev,
        {
          id: `ci-${Date.now()}`,
          summary,
          sourcePrompt: prompt,
        },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "Captured instructions from your last request. They will be included when you close the editor.",
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not commit instructions.");
    } finally {
      setCommitBusy(false);
    }
  };

  const handleClose = () => {
    onRequestClose({
      committedInstructions,
      finalOutput: buildFinalOutput(),
      savedStyleGuide: false,
    });
  };

  const handleDownload = async () => {
    const safeName =
      profile.name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "generation";

    if (isExcel) {
      const blob = await cellsToExcelBlob(excelCells);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = initialOutput.fileName ?? `${safeName}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="generation-editor-page app-page-inner">
      <header className="page-header">
        <div>
          <h1 className="page-title">Edit generation</h1>
          <p className="page-subtitle">
            {profile.name} · {profile.template}
            {isExcel ? " · Excel output" : ""}
          </p>
        </div>
      </header>

      <div className="template-editor-layout generation-editor-layout">
        <aside className="template-editor-chat panel">
          <h2 className="template-editor-chat-title">Review chat</h2>
          <p className="template-editor-chat-context">
            {isExcel
              ? "Prompt the LLM to revise catalog copy. Description columns update from your instructions."
              : "Prompt the LLM to revise the full document. Commit captures rules from your last instruction only."}
          </p>

          <div className="template-editor-messages" role="log" aria-live="polite">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`template-editor-message template-editor-message--${msg.role}`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {chatError && (
            <div className="banner banner-error generation-editor-chat-error" role="alert">
              {chatError}
            </div>
          )}

          <div className="generation-editor-chat-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={commitBusy || chatBusy || !lastUserPrompt}
              onClick={() => void handleCommitToStyleGuide()}
            >
              {commitBusy ? "Extracting…" : "Commit to style guide"}
            </button>
            {committedInstructions.length > 0 && (
              <span className="generation-editor-commit-count">
                {committedInstructions.length} staged
              </span>
            )}
          </div>

          <form
            className="template-editor-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submitChat();
            }}
          >
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                isExcel
                  ? "e.g. Shorten all descriptions and keep a formal tone…"
                  : "e.g. Make the tone more energetic and shorten the intro…"
              }
              rows={3}
              disabled={chatBusy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitChat();
                }
              }}
            />
            <button type="submit" className="btn-primary" disabled={chatBusy || !chatInput.trim()}>
              <IconSend size={18} />
              {chatBusy ? "Working…" : "Send"}
            </button>
          </form>
        </aside>

        <section className="template-editor-preview panel generation-editor-document">
          <div className="generation-editor-document-toolbar">
            <div className="generation-editor-document-heading">
              <h2 className="template-editor-preview-title">
                {isExcel ? "Generated workbook" : "Generated document"}
              </h2>
              <p className="template-editor-preview-desc generation-editor-document-desc">
                {isExcel
                  ? "Edit cells in the grid. Download saves a .xlsx file."
                  : "Edit directly or highlight a passage, then click Regenerate section."}
              </p>
            </div>
            <div className="generation-editor-document-actions">
              {!isExcel && selection?.text.trim() && (
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={sectionBusy || chatBusy}
                  onClick={() => void handleRegenerateSection()}
                >
                  {sectionBusy ? "Regenerating…" : "Regenerate section"}
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={handleClose}>
                Close editor
              </button>
              <button type="button" className="btn-primary" onClick={() => void handleDownload()}>
                Download{isExcel ? " Excel" : ""}
              </button>
            </div>
          </div>

          {isExcel ? (
            <div className="generation-editor-excel">
              <ExcelGridEditor
                cells={excelCells}
                activeKey={excelActiveKey}
                onActiveKeyChange={setExcelActiveKey}
                onCellsChange={setExcelCells}
                onFormatFocus={() => undefined}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="generation-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={updateSelection}
              onMouseUp={updateSelection}
              onKeyUp={updateSelection}
              spellCheck
            />
          )}
        </section>
      </div>
    </div>
  );
}
