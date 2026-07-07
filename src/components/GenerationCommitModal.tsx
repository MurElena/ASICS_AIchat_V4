import { useState } from "react";
import type { CommittedInstruction } from "./GenerationEditor";
import { formatUserStyleGuideName } from "../data/styleGuidesStore";

interface GenerationCommitModalProps {
  instructions: CommittedInstruction[];
  userName: string;
  onCancel: () => void;
  onCloseWithoutCommitting: () => void;
  onCommit: (editedInstructions: CommittedInstruction[]) => void;
}

export function GenerationCommitModal({
  instructions,
  userName,
  onCancel,
  onCloseWithoutCommitting,
  onCommit,
}: GenerationCommitModalProps) {
  const styleGuideName = formatUserStyleGuideName(userName);
  const [drafts, setDrafts] = useState(() =>
    instructions.map((item) => ({ ...item, summary: item.summary })),
  );
  const [error, setError] = useState<string | null>(null);

  const updateSummary = (id: string, summary: string) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, summary } : d)));
  };

  const handleCommit = () => {
    const cleaned = drafts.filter((d) => d.summary.trim());
    if (cleaned.length === 0) {
      setError("At least one instruction is required.");
      return;
    }
    setError(null);
    onCommit(cleaned);
  };

  return (
    <div className="glossary-editor-backdrop" role="presentation">
      <div
        className="generation-commit-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="generation-commit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="glossary-editor-header">
          <div>
            <h2 id="generation-commit-title" className="glossary-editor-title">
              Commit to style guide
            </h2>
            <p className="glossary-editor-subtitle">
              Review instructions captured during editing. They will be appended to{" "}
              <strong>{styleGuideName}</strong>.
            </p>
          </div>
        </header>

        <div className="generation-commit-body">
          <p className="meta generation-commit-style-guide-name">
            Style guide: <strong>{styleGuideName}</strong>
          </p>

          <p className="generation-commit-list-label">Committed instructions</p>
          <ul className="generation-commit-list">
            {drafts.map((item, index) => (
              <li key={item.id} className="generation-commit-item">
                <label className="field">
                  <span>Instruction {index + 1}</span>
                  <textarea
                    rows={4}
                    value={item.summary}
                    onChange={(e) => {
                      setError(null);
                      updateSummary(item.id, e.target.value);
                    }}
                  />
                </label>
                <p className="generation-commit-source">From: “{item.sourcePrompt}”</p>
              </li>
            ))}
          </ul>

          {error && (
            <div className="banner banner-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <footer className="glossary-editor-footer generation-commit-footer">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Back to editor
          </button>
          <div className="generation-commit-footer-actions">
            <button type="button" className="btn-ghost" onClick={onCloseWithoutCommitting}>
              Close without committing
            </button>
            <button type="button" className="btn-primary" onClick={handleCommit}>
              Commit
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
