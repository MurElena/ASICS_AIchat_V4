import {
  getApiKeyForSelectedModel,
  getLlmProviderMode,
  getSelectedModelApiId,
  getVercelGatewayApiKey,
  toGatewayModelId,
  type LlmProviderMode,
} from "../data/systemModels";

export interface LlmRequestConfig {
  apiKey?: string;
  model: string;
  providerMode: LlmProviderMode;
}

/** Payload fields sent with every LLM API request from the client. */
export function getLlmRequestConfig(): LlmRequestConfig {
  const providerMode = getLlmProviderMode();
  const rawModel = getSelectedModelApiId();

  if (providerMode === "vercel-gateway") {
    return {
      apiKey: getVercelGatewayApiKey() || undefined,
      model: toGatewayModelId(rawModel),
      providerMode,
    };
  }

  return {
    apiKey: getApiKeyForSelectedModel(),
    model: rawModel,
    providerMode,
  };
}

export function llmRequestBody(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const { apiKey, model, providerMode } = getLlmRequestConfig();
  return {
    ...extra,
    apiKey,
    model,
    providerMode,
  };
}
