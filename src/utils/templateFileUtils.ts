import type { TemplateEditorKind } from "../data/templatesLibrary";
import {
  cellKey,
  decodeCellValue,
  encodeCellValue,
  type TemplateCell,
} from "./templateCellFormat";
import { saveTemplateFile, loadTemplateFile, type StoredTemplateFile } from "./templateFileStore";

export const EXCEL_GRID_ROWS = 8;
export const EXCEL_GRID_COLS = 6;

type XlsxModule = typeof import("xlsx");

let xlsxPromise: Promise<XlsxModule> | null = null;

async function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxPromise) {
    xlsxPromise = import(/* @vite-ignore */ "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
  }
  return xlsxPromise;
}

type DocxModule = typeof import("docx");

let docxPromise: Promise<DocxModule> | null = null;

async function loadDocx(): Promise<DocxModule> {
  if (!docxPromise) {
    docxPromise = import(/* @vite-ignore */ "https://esm.sh/docx@8.5.0");
  }
  return docxPromise;
}

export function templateFileName(kind: TemplateEditorKind, baseName: string): string {
  const safe = baseName.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase() || "template";
  return kind === "excel" ? `${safe}.xlsx` : `${safe}.docx`;
}

export async function createBlankExcelBlob(): Promise<Blob> {
  const XLSX = await loadXlsx();
  const sheet = XLSX.utils.aoa_to_sheet(
    Array.from({ length: EXCEL_GRID_ROWS }, () => Array.from({ length: EXCEL_GRID_COLS }, () => "")),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Template");
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function createBlankWordBlob(): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await loadDocx();
  const doc = new Document({
    sections: [{ children: [new Paragraph({ children: [new TextRun("")] })] }],
  });
  return Packer.toBlob(doc);
}

export async function createBlankTemplateBlob(kind: TemplateEditorKind): Promise<Blob> {
  return kind === "excel" ? createBlankExcelBlob() : createBlankWordBlob();
}

export async function parseExcelCells(blob: Blob): Promise<TemplateCell[]> {
  const XLSX = await loadXlsx();
  const buffer = await blob.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  const cells: TemplateCell[] = [];
  for (let row = 0; row < EXCEL_GRID_ROWS; row++) {
    for (let col = 0; col < EXCEL_GRID_COLS; col++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      const raw = String(sheet[addr]?.v ?? "");
      if (!raw) continue;
      const decoded = decodeCellValue(raw);
      cells.push({
        row,
        col,
        value: decoded.contentType === "text" ? raw.replace(/<[^>]+>/g, "") : decoded.value,
        html: decoded.contentType === "text" ? raw : decoded.value,
        contentType: decoded.contentType,
      });
    }
  }
  return cells;
}

export async function parseWordCells(_blob: Blob): Promise<TemplateCell[]> {
  return defaultWordCells();
}

export async function cellsToExcelBlob(cells: TemplateCell[], baseBlob?: Blob): Promise<Blob> {
  const XLSX = await loadXlsx();
  let wb;
  if (baseBlob) {
    wb = XLSX.read(await baseBlob.arrayBuffer(), { type: "array" });
  } else {
    wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(
        Array.from({ length: EXCEL_GRID_ROWS }, () => Array.from({ length: EXCEL_GRID_COLS }, () => "")),
      ),
      "Template",
    );
  }
  const sheetName = wb.SheetNames[0] ?? "Template";
  const sheet = wb.Sheets[sheetName];

  for (let row = 0; row < EXCEL_GRID_ROWS; row++) {
    for (let col = 0; col < EXCEL_GRID_COLS; col++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      delete sheet[addr];
    }
  }

  for (const cell of cells) {
    const addr = XLSX.utils.encode_cell({ r: cell.row, c: cell.col });
    const plain = cell.contentType === "text" && cell.html ? cell.html : cell.value;
    const encoded = encodeCellValue(plain, cell.contentType);
    if (encoded) {
      sheet[addr] = { t: "s", v: encoded };
    }
  }

  const ref = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: EXCEL_GRID_ROWS - 1, c: EXCEL_GRID_COLS - 1 },
  });
  sheet["!ref"] = ref;

  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function cellsToWordBlob(cells: TemplateCell[], wordHtml?: string): Promise<Blob> {
  const docx = await loadDocx();
  const { Document, Packer, Paragraph, TextRun } = docx;

  let children;
  if (wordHtml?.trim()) {
    const div = typeof document !== "undefined" ? document.createElement("div") : null;
    if (div) {
      div.innerHTML = wordHtml;
      children = [...div.querySelectorAll(".word-prompt-block, .word-doc-body > p, p")].map((el) => {
        const isPrompt =
          el.classList.contains("word-prompt-block") || Boolean(el.closest(".word-prompt-block"));
        const text = el.textContent ?? "";
        const encoded = isPrompt ? `{{prompt}}${text}{{/prompt}}` : text;
        return new Paragraph({ children: [new TextRun(encoded)] });
      });
    }
  }

  if (!children?.length) {
    const sorted = [...cells].sort((a, b) => a.row - b.row);
    children =
      sorted.length > 0
        ? sorted.map((cell) => {
            const encoded = encodeCellValue(cell.value, cell.contentType);
            return new Paragraph({ children: [new TextRun(encoded)] });
          })
        : [new Paragraph({ children: [new TextRun("")] })];
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

export async function persistTemplateFile(
  id: string,
  kind: TemplateEditorKind,
  fileName: string,
  cells: TemplateCell[],
  existingBlob?: Blob,
  wordHtml?: string,
): Promise<StoredTemplateFile> {
  const blob =
    kind === "excel"
      ? await cellsToExcelBlob(cells, existingBlob)
      : await cellsToWordBlob(cells, wordHtml);

  const record: StoredTemplateFile = {
    id,
    fileName,
    mimeType: blob.type,
    blob,
    updatedAt: Date.now(),
  };
  await saveTemplateFile(record);
  return record;
}

export function cellsFromLegacySections(
  sections: { row?: number; col?: number; value: string; contentType?: "text" | "prompt"; promptEnabled?: boolean }[],
  kind: TemplateEditorKind,
): TemplateCell[] {
  if (kind === "excel") {
    return sections
      .filter((s) => s.row !== undefined && s.col !== undefined)
      .map((s) => ({
        row: s.row!,
        col: s.col!,
        value: s.value,
        contentType: s.contentType ?? (s.promptEnabled ? "prompt" : "text"),
      }));
  }
  return sections.map((s, row) => ({
    row,
    col: 0,
    value: s.value,
    contentType: s.contentType ?? (s.promptEnabled ? "prompt" : "text"),
  }));
}

export function defaultExcelCells(): TemplateCell[] {
  return [
    { row: 0, col: 0, value: "", contentType: "text" },
    { row: 0, col: 1, value: "", contentType: "text" },
    { row: 0, col: 2, value: "", contentType: "text" },
  ];
}

export function defaultWordCells(): TemplateCell[] {
  return [];
}

export function defaultCellsForKind(kind: TemplateEditorKind): TemplateCell[] {
  return kind === "excel" ? defaultExcelCells() : defaultWordCells();
}

export { loadTemplateFile, saveTemplateFile };
