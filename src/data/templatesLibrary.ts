export type TemplateInputType = "TEXT" | "FILE";
export type TemplateWorkflowType = "SINGLE" | "MULTI";
export type TemplateEditorKind = "excel" | "word";

export interface TemplateSection {
  id: string;
  label: string;
  value: string;
  contentType?: "text" | "prompt";
  /** @deprecated use contentType === "prompt" */
  promptEnabled?: boolean;
  row?: number;
  col?: number;
}

export interface LibraryTemplate {
  id: string;
  name: string;
  description?: string;
  inputType: TemplateInputType;
  workflowType: TemplateWorkflowType;
  usageCount: number;
  templateFileName?: string;
  editorKind?: TemplateEditorKind;
  editorSections?: TemplateSection[];
  editorFileId?: string;
}

export const INPUT_TYPE_OPTIONS: { value: TemplateInputType; label: string }[] = [
  { value: "TEXT", label: "Text — type or paste text input" },
  { value: "FILE", label: "File — upload input document" },
];

export function defaultExcelSections(): TemplateSection[] {
  return [
    { id: "a1", label: "Product name", value: "", row: 0, col: 0 },
    { id: "b1", label: "Short description", value: "", row: 0, col: 1 },
    { id: "c1", label: "Key features", value: "", row: 0, col: 2 },
    { id: "a2", label: "Target audience", value: "", row: 1, col: 0 },
    { id: "b2", label: "Tone of voice", value: "", row: 1, col: 1 },
    { id: "c2", label: "Call to action", value: "", row: 1, col: 2 },
  ];
}

export function defaultWordSections(): TemplateSection[] {
  return [
    { id: "title", label: "Title", value: "" },
    { id: "intro", label: "Introduction", value: "" },
    { id: "body", label: "Body", value: "" },
    { id: "cta", label: "Call to action", value: "" },
  ];
}

export function defaultSectionsForKind(kind: TemplateEditorKind): TemplateSection[] {
  return kind === "excel" ? defaultExcelSections() : defaultWordSections();
}

export const INPUT_TYPE_TAGS = ["All input types", "TEXT", "FILE"] as const;
export const MODE_TAGS = ["All modes", "SINGLE", "MULTI"] as const;

export type InputTypeFilter = (typeof INPUT_TYPE_TAGS)[number];
export type ModeFilter = (typeof MODE_TAGS)[number];

/** @deprecated Use MODE_TAGS */
export const WORKFLOW_TAGS = MODE_TAGS;
/** @deprecated Use ModeFilter */
export type WorkflowFilter = ModeFilter;

export const TEMPLATE_FILE_ACCEPT = ".docx,.xlsx";
export const MAX_TEMPLATE_FILE_BYTES = 5 * 1024 * 1024;

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  {
    id: "product-description",
    name: "Product Description",
    description: "SEO-friendly copy for a single SKU or product line.",
    inputType: "TEXT",
    workflowType: "SINGLE",
    usageCount: 342,
  },
  {
    id: "email-campaign",
    name: "Email Campaign",
    description: "Subject line, preview text, and body for one send.",
    inputType: "TEXT",
    workflowType: "SINGLE",
    usageCount: 218,
  },
  {
    id: "press-release",
    name: "Press Release",
    description: "Formal announcement structure for media distribution.",
    inputType: "FILE",
    workflowType: "SINGLE",
    usageCount: 97,
    templateFileName: "press-release.docx",
  },
  {
    id: "catalog-batch",
    name: "Catalog Batch Descriptions",
    description: "Batch product descriptions from catalog uploads.",
    inputType: "FILE",
    workflowType: "MULTI",
    usageCount: 156,
    templateFileName: "catalog-batch.xlsx",
  },
  {
    id: "multi-sku",
    name: "Multi-SKU Listings",
    description: "Marketplace listings for multiple SKUs at once.",
    inputType: "FILE",
    workflowType: "MULTI",
    usageCount: 203,
    templateFileName: "multi-sku.xlsx",
  },
  {
    id: "social-media",
    name: "Social Media Copy",
    inputType: "TEXT",
    workflowType: "SINGLE",
    usageCount: 289,
  },
  {
    id: "product-spec",
    name: "Product Spec Sheet",
    description: "Technical specifications and compliance notes.",
    inputType: "FILE",
    workflowType: "SINGLE",
    usageCount: 74,
    templateFileName: "product-spec.docx",
  },
  {
    id: "job-posting",
    name: "Job Posting",
    inputType: "TEXT",
    workflowType: "SINGLE",
    usageCount: 61,
  },
];

export const EXAMPLE_CSV_CONTENT = `name,description,inputType,workflowType
Product Description,SEO product copy,TEXT,SINGLE
Catalog Batch Descriptions,Batch from catalog,FILE,MULTI
`;

export function slugifyTemplateId(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "template"
  );
}

export function isMultiproductTemplate(t: LibraryTemplate): boolean {
  return t.workflowType === "MULTI";
}
