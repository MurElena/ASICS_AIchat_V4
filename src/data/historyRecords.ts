import type { GenerationStatus, GenerationType } from "./mock";

export interface HistoryRecord {
  id: string;
  status: GenerationStatus;
  type: GenerationType;
  title: string;
  description: string;
  date: string;
  createdBy: string;
  templateName?: string;
}

export const HISTORY_RECORDS: HistoryRecord[] = [
  {
    id: "h1",
    status: "done",
    type: "single",
    title: "Product Description — Summer Runner Pro",
    description: "Footwear · TEXT input · Standard Product Description template",
    date: "Jun 1, 2026 · 10:24 AM",
    createdBy: "Alex Dubois",
    templateName: "Product Description",
  },
  {
    id: "h2",
    status: "done",
    type: "multiproduct",
    title: "Catalog Batch — Footwear Q2",
    description: "24 SKUs · FILE upload · Catalog Descriptions template",
    date: "May 31, 2026 · 4:12 PM",
    createdBy: "Morgan Lee",
    templateName: "Catalog Batch Descriptions",
  },
  {
    id: "h3",
    status: "done",
    type: "single",
    title: "Email Campaign — Enterprise Nurture",
    description: "Q2 sequence · TEXT · Email Campaign template",
    date: "May 31, 2026 · 11:05 AM",
    createdBy: "Alex Dubois",
    templateName: "Email Campaign",
  },
  {
    id: "h4",
    status: "processing",
    type: "multiproduct",
    title: "Multi-SKU Marketplace Listings",
    description: "18 products · In progress",
    date: "May 30, 2026 · 3:40 PM",
    createdBy: "Samira Patel",
    templateName: "Multi-SKU Listings",
  },
  {
    id: "h5",
    status: "done",
    type: "single",
    title: "Social Media Copy — Launch Week",
    description: "LinkedIn posts · TEXT · Social Media Copy",
    date: "May 30, 2026 · 9:18 AM",
    createdBy: "Mario Rossi",
    templateName: "Social Media Copy",
  },
  {
    id: "h6",
    status: "error",
    type: "multiproduct",
    title: "Home Goods Catalog Import",
    description: "240 items · Failed at validation step",
    date: "May 29, 2026 · 2:55 PM",
    createdBy: "Alex Dubois",
    templateName: "Catalog Batch Descriptions",
  },
  {
    id: "h7",
    status: "pending",
    type: "single",
    title: "Press Release — Partnership",
    description: "Queued · FILE input",
    date: "May 29, 2026 · 8:00 AM",
    createdBy: "Jordan Kim",
    templateName: "Press Release",
  },
  {
    id: "h8",
    status: "done",
    type: "single",
    title: "Job Posting — Content Strategist",
    description: "Recruitment · TEXT · Job Posting template",
    date: "May 28, 2026 · 5:30 PM",
    createdBy: "Mario Rossi",
    templateName: "Job Posting",
  },
];
