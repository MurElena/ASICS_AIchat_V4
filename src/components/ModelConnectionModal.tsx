import { useState, type FormEvent } from "react";
import type { LlmModel } from "../data/systemModels";

export interface ModelConnectionValues {
  displayName: string;
  modelId: string;
  provider: string;
  apiKey: string;
}

interface ModelConnectionModalProps {
  mode: "add" | "edit";
  model?: LlmModel;
  initialApiKey?: string;
  onComplete: (values: ModelConnectionValues, isCustom: boolean, modelId?: string) => void;
  onCancel: () => void;
}

export function ModelConnectionModal({
  mode,
  model,
  initialApiKey = "",
  onComplete,
  onCancel,
}: ModelConnectionModalProps) {
  const isBuiltIn = mode === "edit" && model && !model.isCustom;

  const [displayName, setDisplayName] = useState(model?.displayName ?? "");
  const [modelApiId, setModelApiId] = useState(model?.modelId ?? "");
  const [provider, setProvider] = useState(model?.provider ?? "OpenAI");
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (!isBuiltIn && (!modelApiId.trim() || !provider.trim())) {
      setError("Model ID and provider are required.");
      return;
    }
    if (!apiKey.trim()) {
      setError("API key is required.");
      return;
    }
    setError(null);
    onComplete(
      {
        displayName: displayName.trim(),
        modelId: isBuiltIn ? model!.modelId : modelApiId.trim(),
        provider: isBuiltIn ? model!.provider : provider.trim(),
        apiKey: apiKey.trim(),
      },
      !isBuiltIn,
      model?.id,
    );
  };

  const title = mode === "add" ? "Add new model" : "Change connection";

  return (
    <div className="glossary-editor-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="add-model-wizard panel"
        role="dialog"
        aria-labelledby="model-connection-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="glossary-editor-header">
          <div>
            <h2 id="model-connection-title" className="glossary-editor-title">
              {title}
            </h2>
            <p className="glossary-editor-subtitle">
              {mode === "add"
                ? "Add a model connection for content generation"
                : `Update settings for ${model?.displayName}`}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </header>

        <form className="add-model-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Connection name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. GPT-4o Mini"
              required
            />
          </label>

          <label className="field">
            <span>Model ID (API)</span>
            <input
              type="text"
              value={modelApiId}
              onChange={(e) => setModelApiId(e.target.value)}
              placeholder="e.g. gpt-4o-mini"
              required
              readOnly={isBuiltIn}
              disabled={isBuiltIn}
            />
            {isBuiltIn && (
              <span className="field-hint">Built-in model ID cannot be changed.</span>
            )}
          </label>

          <label className="field">
            <span>Provider</span>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. OpenAI"
              required
              readOnly={isBuiltIn}
              disabled={isBuiltIn}
            />
          </label>

          <label className="field">
            <span>API key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              required
            />
            <span className="field-hint">
              Stored in your browser for this demo. Sent to the API server when generating.
            </span>
          </label>

          {error && (
            <div className="banner banner-error" role="alert">
              {error}
            </div>
          )}

          <footer className="glossary-editor-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {mode === "add" ? "Add connection" : "Save connection"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
