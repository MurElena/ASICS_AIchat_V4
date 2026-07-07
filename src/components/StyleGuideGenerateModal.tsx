import { useState } from "react";

interface StyleGuideGenerateModalProps {
  initialName: string;
  initialContent: string;
  onClose: () => void;
  onSave: (name: string, content: string) => void;
}

export function StyleGuideGenerateModal({
  initialName,
  initialContent,
  onClose,
  onSave,
}: StyleGuideGenerateModalProps) {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError("Enter a style guide name.");
      return;
    }
    if (!content.trim()) {
      setError("Style guide content cannot be empty.");
      return;
    }
    setError(null);
    onSave(name.trim(), content.trim());
  };

  return (
    <div className="glossary-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="style-guide-generate-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-guide-generate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="glossary-editor-header">
          <div>
            <h2 id="style-guide-generate-title" className="glossary-editor-title">
              Generated style guide
            </h2>
            <p className="glossary-editor-subtitle">
              Review and edit the generated guide before saving it to your library.
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="style-guide-generate-body">
          <label className="field">
            <span>Style guide name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setError(null);
                setName(e.target.value);
              }}
              placeholder="e.g. Corporate Tone of Voice 2026"
            />
          </label>

          <label className="field">
            <span>Style guide content</span>
            <textarea
              className="style-guide-generate-textarea"
              value={content}
              onChange={(e) => {
                setError(null);
                setContent(e.target.value);
              }}
              rows={16}
              spellCheck
            />
          </label>

          {error && (
            <div className="banner banner-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <footer className="glossary-editor-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

export function StyleGuideGeneratingOverlay({ fileName }: { fileName: string }) {
  return (
    <div className="style-guide-generating-overlay" role="status" aria-live="polite">
      <div className="style-guide-generating-card panel">
        <div className="wizard-inline-progress" aria-hidden>
          <div className="wizard-inline-progress-fill wizard-inline-progress-fill--indeterminate" />
        </div>
        <p className="style-guide-generating-title">Generating style guide…</p>
        <p className="style-guide-generating-meta">
          Analyzing <strong>{fileName}</strong> and compressing it into LLM-ready writing rules.
        </p>
      </div>
    </div>
  );
}
