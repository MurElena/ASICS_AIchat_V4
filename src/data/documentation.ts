import type { AppView } from "./session";

export interface DocArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  body: string;
  linkView?: AppView;
}

export const DOC_ARTICLES: DocArticle[] = [
  {
    id: "overview",
    title: "Platform overview",
    summary: "Understand the Copy studio workspace and navigation.",
    category: "Getting started",
    body: "Use the top bar to switch between AI and Manual generation, start new chats, and open your account menu for settings and documentation.",
  },
  {
    id: "single-gen",
    title: "Generate from saved profiles",
    summary: "Run configured single or multiproduct profiles from cards.",
    category: "Generation",
    body: "Open Generate, choose a saved profile, review the collapsible settings, then click Run Generation. Profile settings are configured when you launch a new generation.",
    linkView: "home",
  },
  {
    id: "multi-gen",
    title: "Multiproduct generation",
    summary: "Batch catalogs with per-product context and templates.",
    category: "Generation",
    body: "Process multiple products in one run. Review extracted products, assign templates globally or per SKU, then merge outputs to Excel or Word.",
    linkView: "home",
  },
  {
    id: "templates",
    title: "Configuration",
    summary: "Manage templates and brand voice materials.",
    category: "Configuration",
    body: "Use Configuration to manage templates, dictionaries, style guides, and reference content.",
    linkView: "home",
  },
  {
    id: "knowledge",
    title: "Brand Voice Materials",
    summary: "Dictionaries, style guides, and reference content for guided output.",
    category: "Knowledge",
    body: "Upload and maintain brand materials that influence terminology, voice, and reference-aware generation.",
    linkView: "home",
  },
  {
    id: "history",
    title: "Generation history",
    summary: "Review, download, and track past jobs.",
    category: "Operations",
    body: "Project managers see all users' history; simple users see their own runs. Download completed outputs from the history list.",
    linkView: "home",
  },
  {
    id: "admin",
    title: "Administration",
    summary: "Users, roles, and LLM model configuration.",
    category: "Admin",
    body: "Invite users, reset passwords, and select the active generation model. Admin role required.",
    linkView: "admin",
  },
  {
    id: "roles",
    title: "Roles & permissions",
    summary: "Admin, Project Manager, and Copywriter capabilities.",
    category: "Security",
    body: "Admins have full access. Project managers manage templates and knowledge. Copywriters run generations and view their history.",
  },
];

export const QUICK_START_STEPS: {
  step: number;
  title: string;
  description: string;
  linkView: AppView;
  linkLabel: string;
}[] = [
  {
    step: 1,
    title: "Choose a generation mode",
    description: "Use the AI / Manual switch in the top bar to set how you want to work.",
    linkView: "home",
    linkLabel: "Go to home",
  },
  {
    step: 2,
    title: "Start a new chat",
    description: "Click New Generation Chat to begin a fresh content session.",
    linkView: "home",
    linkLabel: "Start generating",
  },
  {
    step: 3,
    title: "Manage your account",
    description: "Open the user menu to update your profile or review documentation.",
    linkView: "account",
    linkLabel: "Open account",
  },
];
