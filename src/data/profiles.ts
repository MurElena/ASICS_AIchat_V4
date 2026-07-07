import { DICTIONARIES, OUTPUT_LANGUAGES, OUTPUT_LENGTHS, REFERENCE_DOCUMENTS } from "./wizardConfig";
import { formatUserStyleGuideName } from "./styleGuidesStore";

export type ProfileType = "single" | "multiproduct";

export interface SavedProfile {
  id: string;
  name: string;
  type: ProfileType;
  createdBy: string;
  createdAt: string;
  template: string;
  language: string;
  length: string;
  dictionary: string;
  styleGuides: string[];
  referenceContent: string[];
}

export const DEMO_PROFILE_ID = "demo-product-copy";
export const DEMO_EXCEL_PROFILE_ID = "demo-catalog-excel";

export const DEFAULT_PROFILES: SavedProfile[] = [
  {
    id: DEMO_EXCEL_PROFILE_ID,
    name: "Demo — Catalog Excel Export",
    type: "multiproduct",
    createdBy: "ASICS Copy Studio",
    createdAt: "Demo",
    template: "Standard Product Description",
    language: "English",
    length: "Short (<100 words)",
    dictionary: "Technical Product Terms",
    styleGuides: ["E-commerce Listing Standards"],
    referenceContent: ["Product Photography Standards.pdf"],
  },
  {
    id: DEMO_PROFILE_ID,
    name: "Demo — Product Description",
    type: "single",
    createdBy: "ASICS Copy Studio",
    createdAt: "Demo",
    template: "Product Description",
    language: "English",
    length: "Medium (100–300 words)",
    dictionary: "Corporate — Default",
    styleGuides: ["Corporate Tone of Voice 2026"],
    referenceContent: ["ASICS Brand Guidelines 2024.pdf"],
  },
  {
    id: "profile-product-description",
    name: "Product Description Refresh",
    type: "single",
    createdBy: "Alex Dubois",
    createdAt: "Apr 2025",
    template: "Product Description",
    language: "English",
    length: "Medium (100–300 words)",
    dictionary: "Corporate — Default",
    styleGuides: ["Corporate Tone of Voice 2026"],
    referenceContent: ["ASICS Brand Guidelines 2024.pdf"],
  },
  {
    id: "profile-catalog-batch",
    name: "Catalog Batch Descriptions",
    type: "multiproduct",
    createdBy: "Morgan Lee",
    createdAt: "May 2025",
    template: "Standard Product Description",
    language: "English",
    length: "Short (<100 words)",
    dictionary: "Technical Product Terms",
    styleGuides: ["E-commerce Listing Standards"],
    referenceContent: ["Product Photography Standards.pdf", "Footwear Product Glossary.csv"],
  },
  {
    id: "profile-marketplace",
    name: "Marketplace Multi-SKU Listings",
    type: "multiproduct",
    createdBy: "Alex Dubois",
    createdAt: "Jun 2025",
    template: "Marketplace Listing",
    language: "French",
    length: "Medium (100–300 words)",
    dictionary: "Marketing & Campaigns",
    styleGuides: ["Corporate Tone of Voice 2026"],
    referenceContent: ["Q4 Campaign Brief.pdf"],
  },
];

export const PROFILES_STORAGE_KEY = "contentgen_saved_profiles";
const LEGACY_STORAGE_KEY = "contentgen_saved_workflows";

export const PROFILE_TEMPLATE_OPTIONS = [
  "Product Description",
  "Email Campaign",
  "Standard Product Description",
  "Marketplace Listing",
  "Technical Datasheet",
  "SEO Meta Pack",
];

export const PROFILE_STYLE_GUIDE_OPTIONS = [
  "Corporate Tone of Voice 2026",
  "E-commerce Listing Standards",
  "Email & CRM Writing Standards",
];

/** Personal style guide first, then shared library options. */
export function getProfileStyleGuideOptions(userName: string): string[] {
  const personal = formatUserStyleGuideName(userName);
  const shared = PROFILE_STYLE_GUIDE_OPTIONS.filter((guide) => guide !== personal);
  return [personal, ...shared];
}

export function loadProfiles(): SavedProfile[] {
  try {
    let raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) localStorage.setItem(PROFILES_STORAGE_KEY, raw);
    }
    if (!raw) return DEFAULT_PROFILES;
    const parsed = JSON.parse(raw) as SavedProfile[];
    if (!parsed.some((p) => p.id === DEMO_PROFILE_ID || p.id === DEMO_EXCEL_PROFILE_ID)) {
      const demos = DEFAULT_PROFILES.filter(
        (p) => p.id === DEMO_PROFILE_ID || p.id === DEMO_EXCEL_PROFILE_ID,
      );
      return [...demos.filter((d) => !parsed.some((p) => p.id === d.id)), ...parsed];
    }
    return parsed;
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function saveProfiles(profiles: SavedProfile[]) {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export function newProfileDefaults(createdBy: string, type: ProfileType): SavedProfile {
  return {
    id: `profile-${Date.now()}`,
    name: "",
    type,
    createdBy,
    createdAt: new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date()),
    template: PROFILE_TEMPLATE_OPTIONS[0],
    language: OUTPUT_LANGUAGES[0],
    length: OUTPUT_LENGTHS[1].label,
    dictionary: DICTIONARIES[0].label,
    styleGuides: [formatUserStyleGuideName(createdBy)],
    referenceContent: [REFERENCE_DOCUMENTS[0].label],
  };
}

export const DEMO_SOURCE_TEXT = `GEL-Nimbus 27 — Men's daily trainer
SKU: 1011B863-001
Key points: FF BLAST™ PLUS ECO cushioning, engineered mesh upper, AHAR™ outsole, 8mm drop, 260g (size 9).
Target: neutral runners seeking balanced cushioning for daily miles.
Tone: performance-led, accessible, on-brand ASICS voice.`;
