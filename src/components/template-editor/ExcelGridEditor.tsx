import { useEffect, useRef } from "react";
import type { TemplateCell } from "../../utils/templateCellFormat";
import { cellKey } from "../../utils/templateCellFormat";
import { EXCEL_GRID_COLS, EXCEL_GRID_ROWS } from "../../utils/templateFileUtils";
import { applyFormatCommand, FormatToolbar, stripHtml } from "./FormatToolbar";

function cellRef(row: number, col: number) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

interface ExcelGridEditorProps {
  cells: TemplateCell[];
  activeKey: string;
  onActiveKeyChange: (key: string) => void;
  onCellsChange: (cells: TemplateCell[]) => void;
  onFormatFocus: () => void;
}

function RichCellInput({
  cell,
  isActive,
  onFocus,
  onChange,
}: {
  cell: TemplateCell;
  isActive: boolean;
  onFocus: () => void;
  onChange: (patch: { value: string; html: string }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isPrompt = cell.contentType === "prompt";

  useEffect(() => {
    if (!ref.current || document.activeElement === ref.current) return;
    const next = cell.html ?? cell.value;
    if (ref.current.innerHTML !== next) ref.current.innerHTML = next || "";
  }, [cell.html, cell.value, isActive]);

  return (
    <div
      ref={ref}
      className={`template-rich-input${isPrompt ? " template-rich-input--prompt" : ""}`}
      contentEditable={!isPrompt}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline
      onFocus={onFocus}
      onInput={() => {
        if (!ref.current) return;
        const html = ref.current.innerHTML;
        onChange({ html, value: stripHtml(html) });
      }}
    />
  );
}

export function ExcelGridEditor({
  cells,
  activeKey,
  onActiveKeyChange,
  onCellsChange,
  onFormatFocus,
}: ExcelGridEditorProps) {
  const colLabels = Array.from({ length: EXCEL_GRID_COLS }, (_, i) => String.fromCharCode(65 + i));

  const getCell = (row: number, col: number): TemplateCell =>
    cells.find((c) => c.row === row && c.col === col) ?? {
      row,
      col,
      value: "",
      contentType: "text",
    };

  const patchCell = (row: number, col: number, patch: Partial<TemplateCell>) => {
    const current = getCell(row, col);
    const merged = { ...current, ...patch, row, col };
    const next = cells.filter((c) => !(c.row === row && c.col === col));
    if (merged.value.trim() || merged.html?.trim() || merged.contentType === "prompt") {
      next.push(merged);
    }
    onCellsChange(next.sort((a, b) => a.row - b.row || a.col - b.col));
  };

  const handleFormat = (command: string, value?: string) => {
    onFormatFocus();
    applyFormatCommand(command, value);
    const active = cells.find((c) => cellKey(c.row, c.col) === activeKey);
    if (!active) return;
    const sel = document.getSelection();
    const el = sel?.anchorNode?.parentElement?.closest(".template-rich-input") as HTMLDivElement | null;
    if (el) {
      patchCell(active.row, active.col, {
        html: el.innerHTML,
        value: stripHtml(el.innerHTML),
      });
    }
  };

  return (
    <div className="excel-grid-editor">
      <FormatToolbar onFormat={handleFormat} />
      <div
        className="template-excel-preview"
        style={{ gridTemplateColumns: `36px repeat(${EXCEL_GRID_COLS}, minmax(120px, 1fr))` }}
      >
        <div className="template-excel-corner" />
        {colLabels.map((label) => (
          <div key={label} className="template-excel-col-header">
            {label}
          </div>
        ))}
        {Array.from({ length: EXCEL_GRID_ROWS }, (_, row) => (
          <div key={`row-${row}`} className="template-excel-row" style={{ display: "contents" }}>
            <div className="template-excel-row-header">{row + 1}</div>
            {Array.from({ length: EXCEL_GRID_COLS }, (_, col) => {
              const cell = getCell(row, col);
              const key = cellKey(row, col);
              const isActive = activeKey === key;
              const isPrompt = cell.contentType === "prompt";
              return (
                <div
                  key={key}
                  className={[
                    "template-excel-cell",
                    isActive && "template-excel-cell--selected",
                    isPrompt && "template-excel-cell--prompt",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onActiveKeyChange(key)}
                  role="presentation"
                >
                  <div className="template-cell-header">
                    <span className="template-excel-cell-label">{cellRef(row, col)}</span>
                    {isPrompt && <span className="template-cell-type-badge">Prompt</span>}
                  </div>
                  {isPrompt ? (
                    <div className="template-cell-code-wrap">
                      <code className="template-cell-code-prefix">{"{{prompt}}"}</code>
                      <textarea
                        className="template-cell-code-input"
                        value={cell.value}
                        onChange={(e) =>
                          patchCell(row, col, { value: e.target.value, html: e.target.value })
                        }
                        onFocus={() => onActiveKeyChange(key)}
                        placeholder="Inference prompt…"
                        rows={2}
                      />
                      <code className="template-cell-code-suffix">{"{{/prompt}}"}</code>
                    </div>
                  ) : (
                    <RichCellInput
                      cell={cell}
                      isActive={isActive}
                      onFocus={() => onActiveKeyChange(key)}
                      onChange={({ value, html }) => patchCell(row, col, { value, html })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
