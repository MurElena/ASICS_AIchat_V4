export interface LlmModel {
  id: string;
  displayName: string;
  modelId: string;
  provider: string;
  hasApiKey: boolean;
  isCustom?: boolean;
}

export const DEFAULT_LLM_MODELS: LlmModel[] = [
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    modelId: "gpt-4o-mini",
    provider: "OpenAI",
    hasApiKey: true,
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    modelId: "gpt-4o",
    provider: "OpenAI",
    hasApiKey: true,
  },
  {
    id: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    modelId: "gpt-4.1-mini",
    provider: "OpenAI",
    hasApiKey: true,
  },
];

const MODELS_KEY = "contentgen_llm_models";
const SELECTED_KEY = "contentgen_selected_model";
const MODEL_API_KEYS_KEY = "contentgen_model_api_keys";
const PLATFORM_API_KEY = "contentgen_platform_api_key";
const VERCEL_GATEWAY_API_KEY = "contentgen_vercel_gateway_api_key";
const LLM_PROVIDER_MODE_KEY = "contentgen_llm_provider_mode";
const MODEL_DISPLAY_OVERRIDES = "contentgen_model_display_overrides";

export type LlmProviderMode = "openai" | "vercel-gateway";

export const LLM_PROVIDER_LABELS: Record<LlmProviderMode, string> = {
  openai: "OpenAI (direct)",
  "vercel-gateway": "Vercel AI Gateway",
};

export function loadCustomModels(): LlmModel[] {
  try {
    const raw = localStorage.getItem(MODELS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LlmModel[];
  } catch {
    return [];
  }
}

export function saveCustomModels(models: LlmModel[]) {
  localStorage.setItem(MODELS_KEY, JSON.stringify(models));
}

function loadDisplayOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MODEL_DISPLAY_OVERRIDES);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveDisplayOverride(id: string, displayName: string) {
  const o = loadDisplayOverrides();
  o[id] = displayName;
  localStorage.setItem(MODEL_DISPLAY_OVERRIDES, JSON.stringify(o));
}

function loadModelApiKeys(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MODEL_API_KEYS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveModelApiKey(modelId: string, apiKey: string) {
  const keys = loadModelApiKeys();
  keys[modelId] = apiKey;
  localStorage.setItem(MODEL_API_KEYS_KEY, JSON.stringify(keys));
}

export function removeModelApiKey(modelId: string) {
  const keys = loadModelApiKeys();
  delete keys[modelId];
  localStorage.setItem(MODEL_API_KEYS_KEY, JSON.stringify(keys));
}

export function getPlatformApiKey(): string {
  return localStorage.getItem(PLATFORM_API_KEY) ?? "";
}

export function setPlatformApiKey(key: string) {
  if (key.trim()) {
    localStorage.setItem(PLATFORM_API_KEY, key.trim());
  } else {
    localStorage.removeItem(PLATFORM_API_KEY);
  }
}

export function getVercelGatewayApiKey(): string {
  return localStorage.getItem(VERCEL_GATEWAY_API_KEY) ?? "";
}

export function setVercelGatewayApiKey(key: string) {
  if (key.trim()) {
    localStorage.setItem(VERCEL_GATEWAY_API_KEY, key.trim());
  } else {
    localStorage.removeItem(VERCEL_GATEWAY_API_KEY);
  }
}

export function getLlmProviderMode(): LlmProviderMode {
  const raw = localStorage.getItem(LLM_PROVIDER_MODE_KEY);
  return raw === "vercel-gateway" ? "vercel-gateway" : "openai";
}

export function setLlmProviderMode(mode: LlmProviderMode) {
  localStorage.setItem(LLM_PROVIDER_MODE_KEY, mode);
}

/** Map bare OpenAI model ids to Vercel AI Gateway provider/model slugs. */
export function toGatewayModelId(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) return "openai/gpt-4o-mini";
  if (trimmed.includes("/")) return trimmed;
  return `openai/${trimmed}`;
}

export function hasConfiguredApiKey(): boolean {
  if (getLlmProviderMode() === "vercel-gateway") {
    return Boolean(getVercelGatewayApiKey().trim());
  }
  if (getPlatformApiKey()) return true;
  const keys = loadModelApiKeys();
  return Object.values(keys).some((k) => k.length > 0);
}

export function getAllModels(): LlmModel[] {
  const overrides = loadDisplayOverrides();
  return [...DEFAULT_LLM_MODELS, ...loadCustomModels()].map((m) => ({
    ...m,
    displayName: overrides[m.id] ?? m.displayName,
  }));
}

export function getSelectedModelId(): string {
  return localStorage.getItem(SELECTED_KEY) ?? DEFAULT_LLM_MODELS[0].id;
}

export function setSelectedModelId(id: string) {
  localStorage.setItem(SELECTED_KEY, id);
}

export function getModelById(id: string): LlmModel | undefined {
  return getAllModels().find((m) => m.id === id);
}

export function getSelectedModelApiId(): string {
  const model = getModelById(getSelectedModelId());
  return model?.modelId ?? DEFAULT_LLM_MODELS[0].modelId;
}

/** API key used at generation time: per-model override, else platform key. */
export function getApiKeyForModel(modelConfigId: string): string | undefined {
  const perModel = loadModelApiKeys()[modelConfigId];
  if (perModel?.trim()) return perModel.trim();
  const platform = getPlatformApiKey();
  return platform.trim() || undefined;
}

export function getApiKeyForSelectedModel(): string | undefined {
  return getApiKeyForModel(getSelectedModelId());
}

export function updateCustomModel(updated: LlmModel, apiKey: string) {
  const custom = loadCustomModels().map((m) => (m.id === updated.id ? updated : m));
  saveCustomModels(custom);
  saveModelApiKey(updated.id, apiKey);
}

export function deleteCustomModel(id: string) {
  saveCustomModels(loadCustomModels().filter((m) => m.id !== id));
  removeModelApiKey(id);
  const overrides = loadDisplayOverrides();
  delete overrides[id];
  localStorage.setItem(MODEL_DISPLAY_OVERRIDES, JSON.stringify(overrides));
  if (getSelectedModelId() === id) {
    setSelectedModelId(DEFAULT_LLM_MODELS[0].id);
  }
}

export function updateBuiltInModelConnection(
  id: string,
  displayName: string,
  apiKey: string,
) {
  saveDisplayOverride(id, displayName.trim());
  saveModelApiKey(id, apiKey);
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? "••••••••" : "Not set";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
