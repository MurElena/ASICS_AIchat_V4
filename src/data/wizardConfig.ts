export const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.xlsx";
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const WIZARD_STEPS = [
  { id: "input", label: "Input upload" },
  { id: "context", label: "Context extraction" },
  { id: "template", label: "Assign template" },
  { id: "settings", label: "Global settings" },
  { id: "generate", label: "Generate" },
  { id: "results", label: "Results" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export interface WizardTemplate {
  id: string;
  name: string;
  description: string;
  /** Product-output templates only (used in multiproduct flows). */
  kind?: "product" | "other";
}

export const SINGLE_TEMPLATES: WizardTemplate[] = [
  {
    id: "product-desc",
    name: "Product Description",
    description: "SEO-friendly copy for a single SKU or product line.",
  },
  {
    id: "email-campaign",
    name: "Email Campaign",
    description: "Subject line, preview text, and body for one send.",
  },
  {
    id: "blog-post",
    name: "Blog Article",
    description: "Structured article with intro, sections, and CTA.",
  },
];

/** Product-type templates only — for multiproduct assign-template step. */
export const PRODUCT_TEMPLATES: WizardTemplate[] = [
  {
    id: "standard-description",
    name: "Standard Product Description",
    description: "Paragraph-style copy with features, benefits, and materials.",
    kind: "product",
  },
  {
    id: "marketplace-listing",
    name: "Marketplace Listing",
    description: "Title, bullet points, and specs for e-commerce channels.",
    kind: "product",
  },
  {
    id: "technical-datasheet",
    name: "Technical Datasheet",
    description: "Structured specs, dimensions, and compliance notes.",
    kind: "product",
  },
  {
    id: "seo-meta-pack",
    name: "SEO Meta Pack",
    description: "Meta title, description, and keyword-focused product blurbs.",
    kind: "product",
  },
  {
    id: "comparison-spec",
    name: "Comparison Spec Sheet",
    description: "Side-by-side attributes vs. category benchmarks.",
    kind: "product",
  },
  {
    id: "short-elevator",
    name: "Short Elevator Pitch",
    description: "Two to three sentences for listings and ads.",
    kind: "product",
  },
];

export const OUTPUT_LANGUAGES = [
  "English",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Portuguese",
  "Dutch",
  "Polish",
  "Japanese",
  "Chinese (Simplified)",
] as const;

export const OUTPUT_LENGTHS = [
  { id: "short", label: "Short (<100 words)", apiLength: "short" as const },
  { id: "medium", label: "Medium (100–300 words)", apiLength: "medium" as const },
  { id: "long", label: "Long (300+ words)", apiLength: "long" as const },
];

export const REFERENCE_DOCUMENTS = [
  { id: "brand-voice", label: "Brand Voice Guidelines 2026" },
  { id: "glossary", label: "Product Glossary" },
  { id: "legal", label: "Legal & Compliance Snippets" },
  { id: "competitor", label: "Competitor Messaging Benchmark" },
];

export const DICTIONARIES = [
  { id: "default", label: "Corporate — Default" },
  { id: "technical", label: "Technical Product Terms" },
  { id: "marketing", label: "Marketing & Campaigns" },
  { id: "none", label: "No dictionary" },
];

export type WizardMode = "single" | "multiproduct";

export interface ProductItem {
  id: string;
  name: string;
  context: string;
  templateId: string;
}

export type TemplateAssignmentMode = "global" | "per-product";

export interface ProductResult {
  id: string;
  name: string;
  content: string;
}
