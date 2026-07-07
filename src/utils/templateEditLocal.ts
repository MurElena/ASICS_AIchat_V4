import type { TemplateEditorKind } from "../data/templatesLibrary";
import type { TemplateCellUpdate } from "../api/templateEdit";
import { cellKey, type CellContentType, type TemplateCell } from "./templateCellFormat";

const PROMPT_HINTS =
  /\b(prompt|generate|generat(e|ing|ed)|inference|ai[- ]?written|dynamic(ally)?|fill in|auto[- ]?generate)\b/i;
const TEXT_HINTS =
  /\b(fixed|static|literal|label|header|title|keep as[- ]?is|unchanged|exact text)\b/i;
const CELL_REF = /\b([A-Fa-f]\d{1,2})\b/g;

function colRowFromRef(ref: string): { row: number; col: number } | null {
  const m = ref.trim().match(/^([A-Fa-f])(\d+)$/);
  if (!m) return null;
  const col = m[1].toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(m[2], 10) - 1;
  if (col < 0 || row < 0) return null;
  return { row, col };
}

export function inferContentType(message: string, explicit?: CellContentType): CellContentType {
  if (explicit) return explicit;
  if (PROMPT_HINTS.test(message)) return "prompt";
  if (TEXT_HINTS.test(message)) return "text";
  return "text";
}

export function applyTemplateUpdates(
  cells: TemplateCell[],
  updates: TemplateCellUpdate[],
): TemplateCell[] {
  let next = [...cells];
  for (const u of updates) {
    const existing = next.find((c) => c.row === u.row && c.col === u.col);
    const merged: TemplateCell = {
      row: u.row,
      col: u.col,
      value: u.value,
      html: u.html ?? u.value,
      contentType: u.contentType ?? existing?.contentType ?? "text",
    };
    next = next.filter((c) => !(c.row === u.row && c.col === u.col));
    if (merged.value.trim() || merged.html?.trim() || merged.contentType === "prompt") {
      next.push(merged);
    }
  }
  return next.sort((a, b) => a.row - b.row || a.col - b.col);
}

export function localTemplateEditFallback(
  kind: TemplateEditorKind,
  message: string,
  cells: TemplateCell[],
  selected?: { row: number; col: number },
): { reply: string; updates?: TemplateCellUpdate[]; wordHtml?: string } {
  const refs = [...message.matchAll(CELL_REF)].map((m) => colRowFromRef(m[1])).filter(Boolean) as {
    row: number;
    col: number;
  }[];
  const target = refs[0] ?? selected ?? { row: 0, col: 0 };
  const contentType = inferContentType(message);

  if (kind === "word") {
    const escaped = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const blockClass = contentType === "prompt" ? "word-prompt-block" : "";
    const promptWrap =
      contentType === "prompt"
        ? `<div class="word-prompt-block" data-content-type="prompt"><span class="word-prompt-marker">{{prompt}}</span><p>${escaped}</p><span class="word-prompt-marker">{{/prompt}}</span></div>`
        : `<p>${escaped}</p>`;
    return {
      reply: `Added content to the document as ${contentType}. Connect an API key for richer edits.`,
      wordHtml: `<div class="word-doc-body">${blockClass ? promptWrap : `<p>${escaped}</p>`}</div>`,
    };
  }

  const value = message
    .replace(CELL_REF, "")
    .replace(/^\/prompt\s*/i, "")
    .replace(/^(add|put|set|write)\s+/i, "")
    .trim();

  const updates: TemplateCellUpdate[] = [
    {
      row: target.row,
      col: target.col,
      value,
      html: value,
      contentType,
    },
  ];

  const label = `${String.fromCharCode(65 + target.col)}${target.row + 1}`;
  return {
    reply: `Updated ${label} as ${contentType === "prompt" ? "a prompt field" : "fixed text"}.`,
    updates,
  };
}

export function cellsSnapshot(cells: TemplateCell[]) {
  return cells.map((c) => ({
    row: c.row,
    col: c.col,
    value: c.value,
    contentType: c.contentType,
    html: c.html,
  }));
}

export function defaultActiveKey(kind: TemplateEditorKind): string {
  return kind === "excel" ? cellKey(0, 0) : "word:0";
}
