import { useCallback, useEffect, useRef, useState } from "react";
import { editTemplateWithLlm } from "../api/templateEdit";
import type { TemplateEditorKind } from "../data/templatesLibrary";
import {
  cellKey,
  getCell,
  upsertCell,
  type CellContentType,
  type TemplateCell,
} from "../utils/templateCellFormat";
import {
  applyTemplateUpdates,
  cellsSnapshot,
  defaultActiveKey,
  inferContentType,
  localTemplateEditFallback,
} from "../utils/templateEditLocal";
import {
  loadTemplateFile,
  parseExcelCells,
  persistTemplateFile,
} from "../utils/templateFileUtils";
import { IconChevronLeft, IconSend } from "./Icons";
import { ExcelGridEditor } from "./template-editor/ExcelGridEditor";
import { BLANK_WORD_HTML, WordDocEditor } from "./template-editor/WordDocEditor";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface TemplateEditorProps {
  templateId: string;
  kind: TemplateEditorKind;
  templateName: string;
  fileName: string;
  cells: TemplateCell[];
  onCellsChange: (cells: TemplateCell[]) => void;
  onSave: (fileName: string) => void;
  onBack: () => void;
  embedded?: boolean;
}

function parseActiveKey(key: string): { row: number; col: number } {
  const [row, col] = key.split(":").map(Number);
  return { row: row ?? 0, col: col ?? 0 };
}

function cellLabel(row: number, col: number, kind: TemplateEditorKind): string {
  if (kind === "excel") return `${String.fromCharCode(65 + col)}${row + 1}`;
  return "Document";
}

export function TemplateEditor({
  templateId,
  kind,
  templateName,
  fileName,
  cells,
  onCellsChange,
  onSave,
  onBack,
  embedded = false,
}: TemplateEditorProps) {
  const [activeKey, setActiveKey] = useState(() => defaultActiveKey(kind));
  const [wordHtml, setWordHtml] = useState(BLANK_WORD_HTML);
  const [wordContentType, setWordContentType] = useState<CellContentType>("text");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const baseBlobRef = useRef<Blob | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        kind === "excel"
          ? "Describe changes in chat — the LLM will update cells on the right. Use Text for fixed copy, Prompt for inference fields."
          : "Describe your document in chat — the LLM will edit the Word preview. Use formatting tools and Text/Prompt toggle.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { row: activeRow, col: activeCol } =
    kind === "excel" ? parseActiveKey(activeKey) : { row: 0, col: 0 };
  const activeCell =
    kind === "excel" ? getCell(cells, activeRow, activeCol) : null;
  const activeContentType =
    kind === "excel" ? (activeCell?.contentType ?? "text") : wordContentType;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    (async () => {
      setFileLoading(true);
      setFileError(null);
      try {
        const stored = await loadTemplateFile(templateId);
        if (cancelled) return;
        if (stored?.blob) {
          baseBlobRef.current = stored.blob;
          revoked = URL.createObjectURL(stored.blob);
          setFileUrl(revoked);
          if (kind === "excel") {
            const parsed = await parseExcelCells(stored.blob);
            const hasContent = cells.some((c) => c.value.trim() || c.html?.trim());
            if (!cancelled && parsed.length > 0 && !hasContent) onCellsChange(parsed);
          }
        }
      } catch {
        if (!cancelled) setFileError("Could not load the template file.");
      } finally {
        if (!cancelled) setFileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [templateId, kind, onCellsChange]);

  const setActiveContentType = useCallback(
    (contentType: CellContentType) => {
      if (kind === "excel") {
        const current = getCell(cells, activeRow, activeCol);
        onCellsChange(upsertCell(cells, { ...current, row: activeRow, col: activeCol, contentType }));
      } else {
        setWordContentType(contentType);
      }
    },
    [kind, cells, activeRow, activeCol, onCellsChange],
  );

  const submitChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;

    setChatError(null);
    setChatBusy(true);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setChatInput("");

    const selectedCell = kind === "excel" ? { row: activeRow, col: activeCol } : undefined;

    try {
      const result = await editTemplateWithLlm({
        kind,
        message: text,
        cells: cellsSnapshot(cells),
        selectedCell,
        wordHtml: kind === "word" ? wordHtml : undefined,
      });

      if (result.updates?.length) {
        onCellsChange(applyTemplateUpdates(cells, result.updates));
        const first = result.updates[0];
        if (kind === "excel" && first) {
          setActiveKey(cellKey(first.row, first.col));
        }
      }
      if (result.wordHtml && kind === "word") {
        setWordHtml(result.wordHtml);
      }

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: result.reply },
      ]);
    } catch (err) {
      const inferred = inferContentType(text);
      const fallback = localTemplateEditFallback(kind, text, cells, selectedCell);
      if (fallback.updates?.length) {
        const withType = fallback.updates.map((u) => ({
          ...u,
          contentType: u.contentType ?? inferred,
        }));
        onCellsChange(applyTemplateUpdates(cells, withType));
        if (kind === "excel" && withType[0]) {
          setActiveKey(cellKey(withType[0].row, withType[0].col));
        }
      }
      if (fallback.wordHtml && kind === "word") {
        setWordHtml((prev) => {
          if (prev === BLANK_WORD_HTML) return fallback.wordHtml!;
          return prev + fallback.wordHtml!.replace(/^<div class="word-doc-body">|<\/div>$/g, "");
        });
      }
      const note =
        err instanceof Error ? err.message : "LLM unavailable";
      setChatError(note);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: `${fallback.reply} (${note.includes("API key") ? "Add an API key under Admin → System for full LLM editing." : "Using offline fallback."})`,
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }, [
    chatInput,
    chatBusy,
    kind,
    cells,
    activeRow,
    activeCol,
    wordHtml,
    onCellsChange,
  ]);

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitChat();
    }
  };

  const handleSave = async () => {
    await persistTemplateFile(
      templateId,
      kind,
      fileName,
      cells,
      baseBlobRef.current ?? undefined,
      kind === "word" ? wordHtml : undefined,
    );
    const stored = await loadTemplateFile(templateId);
    if (stored?.blob) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      const url = URL.createObjectURL(stored.blob);
      setFileUrl(url);
      baseBlobRef.current = stored.blob;
    }
    onSave(fileName);
  };

  return (
    <div className={`template-editor${embedded ? " template-editor--embedded" : ""}`}>
      <header className="template-editor-header">
        <div className="template-editor-header-main">
          <button type="button" className="template-editor-back-btn" onClick={onBack}>
            <IconChevronLeft size={18} />
            Back
          </button>
          <h1 className="page-title">{templateName || "Untitled template"}</h1>
          <p className="page-subtitle">
            {kind === "excel" ? "Excel template" : "Word template"} · {fileName}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => void handleSave()}>
          Save
        </button>
      </header>

      <div className="template-editor-layout">
        <aside className="template-editor-chat panel" aria-label="Prompt chat">
          <h2 className="template-editor-chat-title">Prompt</h2>
          <p className="template-editor-chat-context">
            {kind === "excel" ? (
              <>
                Active cell: <strong>{cellLabel(activeRow, activeCol, kind)}</strong>
              </>
            ) : (
              <>Active: <strong>Document</strong></>
            )}
          </p>
          <div className="template-editor-messages">
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
            <p className="template-chat-error" role="status">
              {chatError}
            </p>
          )}
          <div className="template-chat-composer">
            <textarea
              className="template-chat-composer-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Ask the LLM to edit the template…"
              rows={1}
              disabled={chatBusy}
              aria-label="Prompt input"
            />
            <button
              type="button"
              className="template-chat-composer-send"
              disabled={!chatInput.trim() || chatBusy}
              onClick={() => void submitChat()}
              aria-label="Send message"
            >
              <IconSend size={18} />
            </button>
          </div>
          <p className="template-chat-hint">
            Say “make B2 a prompt to generate product descriptions” or “add a bold title in A1”
          </p>
        </aside>

        <div className="template-editor-preview panel" aria-label="Template preview">
          <div className="template-editor-preview-toolbar">
            <div>
              <h2 className="template-editor-preview-title">Preview</h2>
              <p className="template-editor-preview-desc">
                {kind === "excel"
                  ? `Cell ${cellLabel(activeRow, activeCol, kind)} · ${activeContentType}`
                  : `Document · ${activeContentType}`}
              </p>
            </div>
            <div className="template-cell-type-toggle" role="group" aria-label="Cell content type">
              <button
                type="button"
                className={`template-cell-type-btn${activeContentType === "text" ? " template-cell-type-btn--active" : ""}`}
                onClick={() => setActiveContentType("text")}
              >
                Text
              </button>
              <button
                type="button"
                className={`template-cell-type-btn${activeContentType === "prompt" ? " template-cell-type-btn--active" : ""}`}
                onClick={() => setActiveContentType("prompt")}
              >
                Prompt
              </button>
            </div>
          </div>

          {fileUrl && (
            <div className="template-file-embed-bar">
              <span className="template-file-embed-name">{fileName}</span>
              <a className="btn-secondary template-file-embed-open" href={fileUrl} download={fileName}>
                Download file
              </a>
            </div>
          )}

          {fileLoading && <p className="template-file-status">Loading template file…</p>}
          {fileError && (
            <div className="banner banner-error" role="alert">
              {fileError}
            </div>
          )}

          <div className="template-embed-editor">
            {kind === "excel" ? (
              <ExcelGridEditor
                cells={cells}
                activeKey={activeKey}
                onActiveKeyChange={setActiveKey}
                onCellsChange={onCellsChange}
                onFormatFocus={() => {}}
              />
            ) : (
              <WordDocEditor
                html={wordHtml}
                contentType={wordContentType}
                onHtmlChange={setWordHtml}
                onContentTypeChange={setWordContentType}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
