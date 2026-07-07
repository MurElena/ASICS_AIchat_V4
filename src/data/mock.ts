export type GenerationStatus = "done" | "processing" | "pending" | "error";
export type GenerationType = "single" | "multiproduct";

export interface RecentGeneration {
  id: string;
  status: GenerationStatus;
  type: GenerationType;
  title: string;
  description: string;
  date: string;
}

export const METRICS = [
  { label: "Total Generations", value: "1,248" },
  { label: "Active Templates", value: "32" },
  { label: "Success Rate", value: "98.5%" },
  { label: "Avg. Time", value: "14s" },
] as const;

export const RECENT_GENERATIONS: RecentGeneration[] = [
  {
    id: "1",
    status: "done",
    type: "single",
    title: "Product Description",
    description: "Footwear catalog — summer collection line items",
    date: "May 31, 2026",
  },
  {
    id: "2",
    status: "processing",
    type: "multiproduct",
    title: "Email Campaign",
    description: "Q2 nurture sequence for enterprise leads",
    date: "May 31, 2026",
  },
  {
    id: "3",
    status: "done",
    type: "single",
    title: "Social Media Copy",
    description: "LinkedIn posts for product launch week",
    date: "May 30, 2026",
  },
  {
    id: "4",
    status: "pending",
    type: "single",
    title: "Press Release",
    description: "Partnership announcement draft",
    date: "May 30, 2026",
  },
  {
    id: "5",
    status: "done",
    type: "single",
    title: "Job Posting",
    description: "Senior content strategist — remote",
    date: "May 29, 2026",
  },
  {
    id: "6",
    status: "error",
    type: "multiproduct",
    title: "Catalog Batch Descriptions",
    description: "Home goods SKU import — 240 items",
    date: "May 29, 2026",
  },
];
