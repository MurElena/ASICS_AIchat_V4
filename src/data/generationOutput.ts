import { DEMO_EXCEL_PROFILE_ID, type SavedProfile } from "./profiles";
import type { TemplateCell } from "../utils/templateCellFormat";

export type GenerationOutputFormat = "text" | "excel";

export interface GenerationOutput {
  format: GenerationOutputFormat;
  textContent: string;
  excelCells?: TemplateCell[];
  fileName?: string;
}

export function serializeExcelCells(cells: TemplateCell[], rows = 8, cols = 6): string {
  const grid: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));

  for (const cell of cells) {
    if (cell.row < rows && cell.col < cols) {
      grid[cell.row][cell.col] = cell.value;
    }
  }

  return grid
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => row.join("\t"))
    .join("\n");
}

export function buildDemoExcelCatalogCells(
  profile: SavedProfile,
  _sourceText: string,
): TemplateCell[] {
  const rows: { sku: string; name: string; headline: string; description: string }[] = [
    {
      sku: "1011B863-001",
      name: "GEL-Nimbus 27",
      headline: "Smooth daily miles, energized",
      description:
        "Meet the GEL-Nimbus 27 — balanced cushioning for everyday distance. FF BLAST™ PLUS ECO returns energy step after step, while the engineered mesh upper keeps the fit light and adaptive.",
    },
    {
      sku: "1012B045-400",
      name: "GT-2000 13",
      headline: "Stable support for every stride",
      description:
        "Guide your run with LITETRUSS™ technology and smooth transitions. The GT-2000 13 delivers dependable stability for overpronators without sacrificing flexibility on longer efforts.",
    },
    {
      sku: "1011C089-002",
      name: "Metaspeed Sky Paris",
      headline: "Race-day efficiency, tuned for speed",
      description:
        "Built for marathon pace with a carbon plate and energetic foam stack. Metaspeed Sky Paris helps stride-efficient runners maximize forward momentum when it matters most.",
    },
  ];

  const cells: TemplateCell[] = [
    { row: 0, col: 0, value: "SKU", contentType: "text" },
    { row: 0, col: 1, value: "Product Name", contentType: "text" },
    { row: 0, col: 2, value: "Headline", contentType: "text" },
    { row: 0, col: 3, value: "Description", contentType: "text" },
    { row: 0, col: 4, value: "Language", contentType: "text" },
    { row: 0, col: 5, value: "Profile", contentType: "text" },
  ];

  rows.forEach((product, index) => {
    const row = index + 1;
    cells.push(
      { row, col: 0, value: product.sku, contentType: "text" },
      { row, col: 1, value: product.name, contentType: "text" },
      { row, col: 2, value: product.headline, contentType: "text" },
      { row, col: 3, value: product.description, contentType: "text" },
      { row, col: 4, value: profile.language, contentType: "text" },
      { row, col: 5, value: profile.name, contentType: "text" },
    );
  });

  cells.push({
    row: 5,
    col: 0,
    value: `Demo catalog export · ${profile.dictionary}`,
    contentType: "text",
  });

  return cells;
}

export function buildDemoCatalogInputCells(): TemplateCell[] {
  return [
    { row: 0, col: 0, value: "SKU", contentType: "text" },
    { row: 0, col: 1, value: "Product Name", contentType: "text" },
    { row: 0, col: 2, value: "Category", contentType: "text" },
    { row: 0, col: 3, value: "Brief notes", contentType: "text" },
    { row: 1, col: 0, value: "1011B863-001", contentType: "text" },
    { row: 1, col: 1, value: "GEL-Nimbus 27", contentType: "text" },
    { row: 1, col: 2, value: "Footwear", contentType: "text" },
    {
      row: 1,
      col: 3,
      value: "Neutral daily trainer · FF BLAST™ PLUS ECO · 8mm drop",
      contentType: "text",
    },
    { row: 2, col: 0, value: "1012B045-400", contentType: "text" },
    { row: 2, col: 1, value: "GT-2000 13", contentType: "text" },
    { row: 2, col: 2, value: "Footwear", contentType: "text" },
    { row: 2, col: 3, value: "Stability · overpronation · LITETRUSS™", contentType: "text" },
    { row: 3, col: 0, value: "1011C089-002", contentType: "text" },
    { row: 3, col: 1, value: "Metaspeed Sky Paris", contentType: "text" },
    { row: 3, col: 2, value: "Footwear", contentType: "text" },
    { row: 3, col: 3, value: "Race day · carbon plate · marathon pace", contentType: "text" },
  ];
}

export async function createDemoCatalogUploadFile(): Promise<File> {
  const { cellsToExcelBlob } = await import("../utils/templateFileUtils");
  const blob = await cellsToExcelBlob(buildDemoCatalogInputCells());
  return new File([blob], "demo-catalog-input.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function demoApplyTextRevisionToExcelCells(
  cells: TemplateCell[],
  instruction: string,
): TemplateCell[] {
  const lower = instruction.toLowerCase();
  return cells.map((cell) => {
    if (cell.row === 0 || cell.col !== 3) return cell;
    let value = cell.value;
    if (lower.includes("shorter")) {
      value = value.split(".")[0] + ".";
    }
    if (lower.includes("formal")) {
      value = value.replace(/^Meet the /, "Introducing the ");
    }
    return { ...cell, value, html: value };
  });
}

export function buildGenerationOutput(profile: SavedProfile, sourceText: string): GenerationOutput {
  if (profile.id === DEMO_EXCEL_PROFILE_ID) {
    const excelCells = buildDemoExcelCatalogCells(profile, sourceText);
    return {
      format: "excel",
      fileName: "demo-catalog-generation.xlsx",
      excelCells,
      textContent: serializeExcelCells(excelCells),
    };
  }

  const textContent = buildDemoGenerationText(profile, sourceText);
  return {
    format: "text",
    textContent,
    fileName: "generation.txt",
  };
}

function buildDemoGenerationText(profile: SavedProfile, sourceText: string): string {
  const snippet = sourceText.trim().slice(0, 120) || "your product brief";
  if (profile.type === "multiproduct") {
    return `# Catalog generation (demo)

Processed 3 products from upload using profile “${profile.name}”.

## SKU 1011B863-001 — GEL-Nimbus 27
Experience balanced cushioning for everyday miles. FF BLAST™ PLUS ECO midsole foam delivers responsive comfort, while the engineered mesh upper keeps airflow high and weight low.

## SKU 1012B045-400 — GT-2000 13
Stable support meets smooth transitions for overpronators. LITETRUSS™ technology guides your stride without sacrificing flexibility on longer runs.

## SKU 1011C089-002 — Metaspeed Sky Paris
Built for race-day efficiency with a carbon plate and energetic foam stack tuned for stride efficiency at marathon pace.

---
*Demo output · ${profile.language}*`;
  }

  return `# ${profile.template} (demo)

**Headline:** GEL-Nimbus 27 — Smooth daily miles, energized

Built from: ${snippet}${sourceText.length > 120 ? "…" : ""}

---

Meet the GEL-Nimbus 27 — your go-to neutral trainer for everyday distance. FF BLAST™ PLUS ECO cushioning returns energy step after step, while the breathable engineered mesh upper keeps the fit light and adaptive.

AHAR™ rubber on the outsole adds durable traction where you need it most. With an 8mm drop and approximately 260g weight (men's size 9), the Nimbus 27 balances plush comfort and a smooth, stable ride for training days and long weekends alike.

**Key features**
- FF BLAST™ PLUS ECO midsole for responsive cushioning
- Engineered mesh upper for breathability
- AHAR™ outsole for durable grip
- Neutral support · 8mm drop

---
*Demo generation · ${profile.language} · ${profile.length} · ${profile.dictionary}*`;
}
