import { MAX_FILE_BYTES, PRODUCT_TEMPLATES } from "../data/wizardConfig";
import type { ProductItem } from "../data/wizardConfig";

const DEFAULT_PRODUCT_TEMPLATE_ID = PRODUCT_TEMPLATES[0].id;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateUploadFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowed = ["pdf", "docx", "txt", "xlsx"];
  if (!ext || !allowed.includes(ext)) {
    return "Only PDF, DOCX, TXT, and XLSX files are allowed.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File exceeds the 20 MB limit (${formatFileSize(file.size)}).`;
  }
  return null;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}

export function buildMockSummary(text: string, fileName?: string): string {
  const snippet = text.trim().slice(0, 500) || "(content from uploaded file)";
  const source = fileName ? `Uploaded file: ${fileName}` : "Text input";
  return `**Source:** ${source}

**Key themes:** The input focuses on product positioning, target audience, and tone of voice suitable for marketing copy.

**Entities & facts:** Brand name, product category, and primary benefits are inferred from the provided material.

**Recommended use:** Apply the selected template with the chosen language and length settings.

**Excerpt:**
${snippet}${text.length > 500 ? "…" : ""}`;
}

let productIdCounter = 0;
export function newProductId(): string {
  productIdCounter += 1;
  return `product-${productIdCounter}-${Date.now()}`;
}

export function buildMockProducts(sourceText: string, fileName?: string): ProductItem[] {
  const base = sourceText.trim() || fileName || "Catalog upload";
  return [
    {
      id: newProductId(),
      name: "Summer Runner Pro",
      context: `SKU-1001 · ${base}\nLightweight road shoe, mesh upper, responsive foam midsole.`,
      templateId: DEFAULT_PRODUCT_TEMPLATE_ID,
    },
    {
      id: newProductId(),
      name: "Trail Grip 360",
      context: `SKU-1002 · ${base}\nAll-terrain outsole, waterproof membrane, reinforced toe cap.`,
      templateId: DEFAULT_PRODUCT_TEMPLATE_ID,
    },
    {
      id: newProductId(),
      name: "Urban Flex Slip-On",
      context: `SKU-1003 · ${base}\nCasual silhouette, memory foam insole, recycled materials.`,
      templateId: DEFAULT_PRODUCT_TEMPLATE_ID,
    },
    {
      id: newProductId(),
      name: "Court Classic Low",
      context: `SKU-1004 · ${base}\nLeather-look upper, vulcanised sole, unisex sizing.`,
      templateId: DEFAULT_PRODUCT_TEMPLATE_ID,
    },
  ];
}
