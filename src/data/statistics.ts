export interface ModelCost {
  model: string;
  inputPer1M: number;
  outputPer1M: number;
}

export interface UsageRecord {
  id: string;
  date: string;
  model: string;
  user: string;
  template: string;
  inputTokens: number;
  outputTokens: number;
}

export const MODEL_COSTS: ModelCost[] = [
  { model: "GPT-4o Mini", inputPer1M: 0.15, outputPer1M: 0.6 },
  { model: "GPT-4o", inputPer1M: 2.5, outputPer1M: 10 },
  { model: "GPT-4.1 Mini", inputPer1M: 0.4, outputPer1M: 1.6 },
];

export const USAGE_RECORDS: UsageRecord[] = [
  { id: "u1", date: "Jun 1", model: "GPT-4o Mini", user: "Alex Dubois", template: "Product Description", inputTokens: 62000, outputTokens: 18000 },
  { id: "u2", date: "Jun 2", model: "GPT-4o", user: "Mario Rossi", template: "Social Media Copy", inputTokens: 44000, outputTokens: 12000 },
  { id: "u3", date: "Jun 3", model: "GPT-4o Mini", user: "Morgan Lee", template: "Catalog Batch Descriptions", inputTokens: 118000, outputTokens: 52000 },
  { id: "u4", date: "Jun 4", model: "GPT-4.1 Mini", user: "Alex Dubois", template: "Marketplace Listing", inputTokens: 96000, outputTokens: 38000 },
  { id: "u5", date: "Jun 5", model: "GPT-4o Mini", user: "Mario Rossi", template: "Job Posting", inputTokens: 35000, outputTokens: 9000 },
  { id: "u6", date: "Jun 6", model: "GPT-4o", user: "Alex Dubois", template: "Product Spec Sheet", inputTokens: 72000, outputTokens: 22000 },
  { id: "u7", date: "Jun 7", model: "GPT-4.1 Mini", user: "Morgan Lee", template: "Catalog Batch Descriptions", inputTokens: 126000, outputTokens: 61000 },
];

export function estimateCost(record: UsageRecord): number {
  const pricing = MODEL_COSTS.find((m) => m.model === record.model);
  if (!pricing) return 0;
  return (
    (record.inputTokens / 1_000_000) * pricing.inputPer1M +
    (record.outputTokens / 1_000_000) * pricing.outputPer1M
  );
}

