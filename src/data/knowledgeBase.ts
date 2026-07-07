import {
  buildDemoStyleGuideOutput,
  DEMO_STYLE_GUIDE_FILENAME,
  DEMO_STYLE_GUIDE_SOURCE,
} from "./styleGuideDemo";

export const MAX_KNOWLEDGE_FILE_BYTES = 20 * 1024 * 1024;

export type KnowledgeTab = "dictionaries" | "style-guides" | "reference-content";

export interface KnowledgeAsset {
  id: string;
  name: string;
  usageCount: number;
  label: string;
  uploadedAt: string;
  createdBy?: string;
}

export type KnowledgeFile = KnowledgeAsset;

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

export interface Glossary extends KnowledgeAsset {
  terms: GlossaryTerm[];
}

export type StyleGuide = KnowledgeAsset & {
  content?: string;
  userId?: string;
  isUserGuide?: boolean;
};

const demoStyleGuide = buildDemoStyleGuideOutput(
  DEMO_STYLE_GUIDE_FILENAME,
  DEMO_STYLE_GUIDE_SOURCE,
);

export const KNOWLEDGE_FILE_ACCEPT = ".pdf,.docx,.txt";
export const GLOSSARY_FILE_ACCEPT = ".csv,.json,.txt";
export const STYLE_GUIDE_ACCEPT = ".pdf,.docx,.txt";

export const MOCK_KNOWLEDGE_FILES: KnowledgeFile[] = [
  {
    id: "1",
    name: "ASICS Brand Guidelines 2024.pdf",
    usageCount: 28,
    label: "Reference content",
    uploadedAt: "2026-04-12",
  },
  {
    id: "2",
    name: "Product Photography Standards.pdf",
    usageCount: 14,
    label: "Reference content",
    uploadedAt: "2026-03-28",
  },
  {
    id: "3",
    name: "Q4 Campaign Brief.pdf",
    usageCount: 7,
    label: "Reference content",
    uploadedAt: "2026-02-15",
  },
];

export const MOCK_GLOSSARIES: Glossary[] = [
  {
    id: "g1",
    name: "Footwear Product Glossary.csv",
    usageCount: 19,
    label: "Glossary",
    uploadedAt: "2026-04-01",
    terms: [
      { id: "t1", term: "GEL™ cushioning", definition: "Proprietary shock absorption technology used in midsoles." },
      { id: "t2", term: "FlyteFoam", definition: "Lightweight foam compound designed for responsive ride." },
      { id: "t3", term: "AHAR™ outsole", definition: "High-abrasion rubber placed in critical wear areas." },
    ],
  },
  {
    id: "g2",
    name: "E-commerce Listing Terms.json",
    usageCount: 11,
    label: "Glossary",
    uploadedAt: "2026-03-10",
    terms: [
      { id: "t4", term: "SKU", definition: "Stock keeping unit — unique identifier per sellable variant." },
      { id: "t5", term: "Bullet", definition: "Short feature line in marketplace product listings." },
    ],
  },
];

export const MOCK_STYLE_GUIDES: StyleGuide[] = [
  {
    id: "demo-sg",
    name: demoStyleGuide.name,
    usageCount: 0,
    label: "Style guide",
    uploadedAt: "Demo",
    content: demoStyleGuide.content,
  },
  {
    id: "s1",
    name: "Corporate Tone of Voice 2026.pdf",
    usageCount: 22,
    label: "Style guide",
    uploadedAt: "2026-03-20",
  },
  {
    id: "s2",
    name: "Email & CRM Writing Standards.docx",
    usageCount: 9,
    label: "Style guide",
    uploadedAt: "2026-02-02",
  },
];

export const EXAMPLE_KNOWLEDGE_FILE_CONTENT = `Brand Voice & Knowledge Base — Example
=====================================

Use this file as a reference for structuring knowledge uploads.

## Tone
- Professional, approachable, and confident
- Avoid jargon unless writing for technical audiences

## Product facts
- Always cite source documents for specifications
- Do not invent features not listed in approved materials
`;

export const EXAMPLE_GLOSSARY_CSV = `term,definition
GEL™ cushioning,Proprietary shock absorption technology used in midsoles.
FlyteFoam,Lightweight foam compound designed for responsive ride.
SKU,Stock keeping unit — unique identifier per sellable variant.
`;

export const EXAMPLE_STYLE_GUIDE_CONTENT = `Style Guide — Example
=====================

## Voice
- Clear, confident, and human
- Prefer active voice and short sentences

## Formatting
- Use sentence case for headings
- Oxford comma for EN-US content

## Restrictions
- Do not guarantee performance outcomes
- Avoid competitor names unless approved
`;

export function newTermId(): string {
  return `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
