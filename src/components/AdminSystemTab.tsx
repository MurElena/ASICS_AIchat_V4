import { useMemo, useState } from "react";
import { IconSearch } from "./Icons";
import { ModelConnectionModal, type ModelConnectionValues } from "./ModelConnectionModal";
import {
  deleteCustomModel,
  getAllModels,
  getApiKeyForModel,
  getLlmProviderMode,
  getPlatformApiKey,
  getSelectedModelId,
  getVercelGatewayApiKey,
  LLM_PROVIDER_LABELS,
  loadCustomModels,
  maskApiKey,
  saveCustomModels,
  saveModelApiKey,
  setLlmProviderMode,
  setPlatformApiKey,
  setSelectedModelId,
  setVercelGatewayApiKey,
  updateBuiltInModelConnection,
  updateCustomModel,
  type LlmModel,
  type LlmProviderMode,
} from "../data/systemModels";

export function AdminSystemTab() {
  const [models, setModels] = useState<LlmModel[]>(() => getAllModels());
  const [selectedModelId, setSelectedModelIdState] = useState(getSelectedModelId);
  const [platformKey, setPlatformKey] = useState(getPlatformApiKey);
  const [platformKeySaved, setPlatformKeySaved] = useState(false);
  const [vercelGatewayKey, setVercelGatewayKey] = useState(getVercelGatewayApiKey);
  const [vercelGatewayKeySaved, setVercelGatewayKeySaved] = useState(false);
  const [llmProviderMode, setLlmProviderModeState] = useState<LlmProviderMode>(getLlmProviderMode);
  const [search, setSearch] = useState("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingModel, setEditingModel] = useState<LlmModel | null>(null);

  const refreshModels = () => setModels(getAllModels());

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q),
    );
  }, [models, search]);

  const notifyLlmConfigChanged = () => {
    window.dispatchEvent(new CustomEvent("contentgen-model-changed"));
    window.dispatchEvent(new CustomEvent("contentgen-llm-config-changed"));
  };

  const handleSavePlatformKey = () => {
    setPlatformApiKey(platformKey);
    setPlatformKeySaved(true);
    setSystemMessage("Platform API key saved. Used by built-in models unless overridden per connection.");
    setTimeout(() => setPlatformKeySaved(false), 2000);
    notifyLlmConfigChanged();
  };

  const handleSaveVercelGatewayKey = () => {
    setVercelGatewayApiKey(vercelGatewayKey);
    setVercelGatewayKeySaved(true);
    setSystemMessage("Vercel AI Gateway key saved. Live LLM features will route through the gateway.");
    setTimeout(() => setVercelGatewayKeySaved(false), 2000);
    notifyLlmConfigChanged();
  };

  const handleProviderModeChange = (mode: LlmProviderMode) => {
    setLlmProviderMode(mode);
    setLlmProviderModeState(mode);
    setSystemMessage(
      mode === "vercel-gateway"
        ? "LLM provider set to Vercel AI Gateway. Add your gateway API key below to run live demos."
        : "LLM provider set to OpenAI (direct). Use the platform or per-model keys below.",
    );
    notifyLlmConfigChanged();
  };

  const setActive = (id: string) => {
    setSelectedModelId(id);
    setSelectedModelIdState(id);
    const m = models.find((x) => x.id === id);
    setSystemMessage(`${m?.displayName ?? id} is now the active generation model.`);
    notifyLlmConfigChanged();
  };

  const handleAddComplete = (values: ModelConnectionValues) => {
    const id = `custom-${values.modelId.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
    const newModel: LlmModel = {
      id,
      displayName: values.displayName,
      modelId: values.modelId,
      provider: values.provider,
      hasApiKey: true,
      isCustom: true,
    };
    saveCustomModels([...loadCustomModels(), newModel]);
    saveModelApiKey(id, values.apiKey);
    refreshModels();
    setModalMode(null);
    setActive(id);
  };

  const handleEditComplete = (values: ModelConnectionValues, _isCustom: boolean, modelId?: string) => {
    if (!modelId || !editingModel) return;
    if (editingModel.isCustom) {
      updateCustomModel(
        {
          ...editingModel,
          displayName: values.displayName,
          modelId: values.modelId,
          provider: values.provider,
        },
        values.apiKey,
      );
    } else {
      updateBuiltInModelConnection(modelId, values.displayName, values.apiKey);
    }
    refreshModels();
    setModalMode(null);
    setEditingModel(null);
    setSystemMessage(`Connection “${values.displayName}” updated.`);
  };

  const handleDelete = (model: LlmModel) => {
    if (!model.isCustom) return;
    if (!window.confirm(`Delete connection “${model.displayName}”?`)) return;
    deleteCustomModel(model.id);
    refreshModels();
    setSelectedModelIdState(getSelectedModelId());
    setSystemMessage(`Deleted ${model.displayName}.`);
  };

  const openEdit = (model: LlmModel) => {
    setEditingModel(model);
    setModalMode("edit");
  };

  return (
    <div className="admin-system-full">
      <section className="admin-platform-key panel">
        <h2 className="admin-section-title">LLM provider</h2>
        <p className="wizard-step-desc">
          Choose how the app connects to language models. With a key configured, generation, style
          guides, template editing, and the generation editor use live LLMs instead of demo
          fallbacks.
        </p>
        <div className="admin-provider-options" role="radiogroup" aria-label="LLM provider">
          {(Object.keys(LLM_PROVIDER_LABELS) as LlmProviderMode[]).map((mode) => (
            <label key={mode} className="admin-provider-option">
              <input
                type="radio"
                name="llm-provider"
                value={mode}
                checked={llmProviderMode === mode}
                onChange={() => handleProviderModeChange(mode)}
              />
              <span>{LLM_PROVIDER_LABELS[mode]}</span>
            </label>
          ))}
        </div>
      </section>

      {llmProviderMode === "vercel-gateway" ? (
        <section className="admin-platform-key panel">
          <h2 className="admin-section-title">Vercel AI Gateway API key</h2>
          <p className="wizard-step-desc">
            Create a key in the{" "}
            <a href="https://vercel.com/dashboard/ai-gateway" target="_blank" rel="noreferrer">
              Vercel AI Gateway dashboard
            </a>
            . Requests are routed through{" "}
            <code>https://ai-gateway.vercel.sh/v1</code> using your selected model (e.g.{" "}
            <code>openai/gpt-4o-mini</code>).
          </p>
          <label className="field">
            <span>Gateway API key</span>
            <input
              type="password"
              value={vercelGatewayKey}
              onChange={(e) => setVercelGatewayKey(e.target.value)}
              placeholder="vck_…"
              autoComplete="off"
            />
          </label>
          <button type="button" className="btn-primary" onClick={handleSaveVercelGatewayKey}>
            {vercelGatewayKeySaved ? "Saved" : "Save gateway key"}
          </button>
          {vercelGatewayKey && (
            <p className="meta">
              Stored key: <span>{maskApiKey(vercelGatewayKey)}</span>
            </p>
          )}
        </section>
      ) : (
        <section className="admin-platform-key panel">
          <h2 className="admin-section-title">Platform API key (OpenAI)</h2>
          <p className="wizard-step-desc">
            Set your OpenAI key here as an admin — no <code>.env</code> file required for demos.
            Built-in models use this key unless a connection has its own key.
          </p>
          <label className="field">
            <span>OpenAI API key</span>
            <input
              type="password"
              value={platformKey}
              onChange={(e) => setPlatformKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
            />
          </label>
          <button type="button" className="btn-primary" onClick={handleSavePlatformKey}>
            {platformKeySaved ? "Saved" : "Save API key"}
          </button>
        </section>
      )}

      <section className="admin-models-section">
        <div className="admin-models-toolbar">
          <h2 className="admin-section-title">Model connections</h2>
          <div className="admin-models-toolbar-actions">
            <div className="templates-search admin-models-search">
              <IconSearch size={18} className="templates-search-icon" />
              <input
                type="search"
                className="templates-search-input"
                placeholder="Search models…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className="btn-primary" onClick={() => setModalMode("add")}>
              Add New Model
            </button>
          </div>
        </div>

        <p className="wizard-step-desc">
          Select a card to set the active model for generation. Manage API keys per connection.
        </p>

        {systemMessage && <p className="meta admin-system-msg">{systemMessage}</p>}

        {filteredModels.length === 0 ? (
          <div className="templates-empty panel">
            <p>No models match your search.</p>
          </div>
        ) : (
          <div className="model-cards-grid">
            {filteredModels.map((model) => {
              const isActive = model.id === selectedModelId;
              const apiKey = getApiKeyForModel(model.id) ?? "";
              return (
                <article
                  key={model.id}
                  className={`model-connection-card panel${isActive ? " model-connection-card--active" : ""}`}
                >
                  <div className="model-connection-card-top">
                    {isActive && <span className="model-active-badge">Active</span>}
                    {model.isCustom && (
                      <span className="template-badge template-badge--multi">Custom</span>
                    )}
                  </div>
                  <h3 className="model-connection-name">{model.displayName}</h3>
                  <p className="model-connection-meta">
                    {model.provider} · <code>{model.modelId}</code>
                  </p>
                  <p className="model-connection-key">
                    API key: <span>{maskApiKey(apiKey)}</span>
                  </p>
                  <div className="model-connection-actions">
                    {!isActive && (
                      <button
                        type="button"
                        className="btn-secondary model-connection-btn"
                        onClick={() => setActive(model.id)}
                      >
                        Set active
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-secondary model-connection-btn"
                      onClick={() => openEdit(model)}
                    >
                      Change connection
                    </button>
                    {model.isCustom && (
                      <button
                        type="button"
                        className="btn-ghost btn-danger-text model-connection-btn"
                        onClick={() => handleDelete(model)}
                      >
                        Delete connection
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modalMode === "add" && (
        <ModelConnectionModal
          mode="add"
          onCancel={() => setModalMode(null)}
          onComplete={(values) => handleAddComplete(values)}
        />
      )}

      {modalMode === "edit" && editingModel && (
        <ModelConnectionModal
          mode="edit"
          model={editingModel}
          initialApiKey={getApiKeyForModel(editingModel.id) ?? getPlatformApiKey()}
          onCancel={() => {
            setModalMode(null);
            setEditingModel(null);
          }}
          onComplete={(values, isCustom, id) => handleEditComplete(values, isCustom, id)}
        />
      )}
    </div>
  );
}
