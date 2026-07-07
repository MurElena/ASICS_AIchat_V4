export type CellContentType = "text" | "prompt";

export const PROMPT_START = "{{prompt}}";
export const PROMPT_END = "{{/prompt}}";

export interface TemplateCell {
  row: number;
  col: number;
  value: string;
  contentType: CellContentType;
  html?: string;
}

export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function encodeCellValue(value: string, contentType: CellContentType): string {
  if (contentType === "prompt" && value.trim()) {
    return `${PROMPT_START}${value}${PROMPT_END}`;
  }
  return value;
}

export function decodeCellValue(raw: string): { value: string; contentType: CellContentType } {
  const trimmed = raw ?? "";
  if (trimmed.startsWith(PROMPT_START) && trimmed.endsWith(PROMPT_END)) {
    return {
      contentType: "prompt",
      value: trimmed.slice(PROMPT_START.length, trimmed.length - PROMPT_END.length),
    };
  }
  return { contentType: "text", value: trimmed };
}

export function cellsToMap(cells: TemplateCell[]): Map<string, TemplateCell> {
  return new Map(cells.map((c) => [cellKey(c.row, c.col), c]));
}

export function getCell(cells: TemplateCell[], row: number, col: number): TemplateCell {
  const existing = cells.find((c) => c.row === row && c.col === col);
  return existing ?? { row, col, value: "", contentType: "text" };
}

export function upsertCell(cells: TemplateCell[], cell: TemplateCell): TemplateCell[] {
  const key = cellKey(cell.row, cell.col);
  const map = cellsToMap(cells);
  const hasContent =
    cell.value.trim() || cell.html?.trim() || cell.contentType === "prompt";
  if (!hasContent && cell.contentType === "text") {
    map.delete(key);
  } else {
    map.set(key, cell);
  }
  return [...map.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}
