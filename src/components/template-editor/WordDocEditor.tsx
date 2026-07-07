import { useEffect, useRef } from "react";
import type { CellContentType } from "../../utils/templateCellFormat";
import { applyFormatCommand, FormatToolbar, stripHtml } from "./FormatToolbar";

export const BLANK_WORD_HTML = '<div class="word-doc-body"><p><br></p></div>';

interface WordDocEditorProps {
  html: string;
  contentType: CellContentType;
  onHtmlChange: (html: string) => void;
  onContentTypeChange: (type: CellContentType) => void;
  onSelectionChange?: (plainText: string) => void;
}

export function WordDocEditor({
  html,
  contentType,
  onHtmlChange,
  onContentTypeChange,
  onSelectionChange,
}: WordDocEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || document.activeElement === ref.current) return;
    if (ref.current.innerHTML !== html) ref.current.innerHTML = html || BLANK_WORD_HTML;
  }, [html]);

  const sync = () => {
    if (!ref.current) return;
    onHtmlChange(ref.current.innerHTML);
    onSelectionChange?.(stripHtml(ref.current.innerHTML));
  };

  const handleFormat = (command: string, value?: string) => {
    ref.current?.focus();
    applyFormatCommand(command, value);
    sync();
  };

  const wrapSelectionAsPrompt = () => {
    if (!ref.current) return;
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const text = range.toString() || stripHtml(ref.current.innerHTML);
    const block = document.createElement("div");
    block.className = "word-prompt-block";
    block.dataset.contentType = "prompt";
    block.innerHTML = `<span class="word-prompt-marker">{{prompt}}</span><p>${text || "Describe generated content…"}</p><span class="word-prompt-marker">{{/prompt}}</span>`;
    range.deleteContents();
    range.insertNode(block);
    sync();
  };

  const unwrapPrompt = () => {
    if (!ref.current) return;
    ref.current.querySelectorAll(".word-prompt-block").forEach((el) => {
      const p = el.querySelector("p");
      const text = p?.textContent ?? "";
      const para = document.createElement("p");
      para.textContent = text;
      el.replaceWith(para);
    });
    sync();
  };

  const prevType = useRef(contentType);
  useEffect(() => {
    if (prevType.current === contentType) return;
    prevType.current = contentType;
    if (contentType === "prompt") wrapSelectionAsPrompt();
    else unwrapPrompt();
  }, [contentType]);

  return (
    <div className="word-doc-editor">
      <FormatToolbar onFormat={handleFormat} />
      <div
        ref={ref}
        className={`word-doc-surface${contentType === "prompt" ? " word-doc-surface--prompt-mode" : ""}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label="Word document editor"
        onInput={sync}
        onBlur={sync}
        onKeyUp={sync}
        onMouseUp={() => onSelectionChange?.(stripHtml(ref.current?.innerHTML ?? ""))}
      />
      <div className="word-doc-meta-actions">
        <button type="button" className="btn-ghost btn-ghost--sm" onClick={unwrapPrompt}>
          Convert prompts to text
        </button>
        <button type="button" className="btn-ghost btn-ghost--sm" onClick={wrapSelectionAsPrompt}>
          Mark selection as prompt
        </button>
      </div>
    </div>
  );
}

export function wordHtmlToCells(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  const blocks = div.querySelectorAll(".word-prompt-block p, .word-doc-body > p, p");
  const cells: { row: number; col: number; value: string; contentType: "text" | "prompt"; html: string }[] = [];
  let row = 0;
  div.querySelectorAll(".word-prompt-block, .word-doc-body > p, .word-doc-body > div, p").forEach((el) => {
    if (el.classList.contains("word-prompt-marker")) return;
    const isPrompt = el.classList.contains("word-prompt-block") || el.closest(".word-prompt-block");
    const inner = el.classList.contains("word-prompt-block")
      ? el.querySelector("p")?.innerHTML ?? ""
      : el.innerHTML;
    const value = stripHtml(inner);
    if (!value.trim() && !isPrompt) return;
    cells.push({
      row: row++,
      col: 0,
      value,
      html: inner,
      contentType: isPrompt ? "prompt" : "text",
    });
  });
  return cells;
}
