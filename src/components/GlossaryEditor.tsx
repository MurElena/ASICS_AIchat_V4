import { useMemo, useState } from "react";
import type { Glossary, GlossaryTerm } from "../data/knowledgeBase";
import { newTermId } from "../data/knowledgeBase";

interface GlossaryEditorProps {
  glossary: Glossary;
  onSave: (terms: GlossaryTerm[]) => void;
  onClose: () => void;
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

function findDuplicateTermIds(terms: GlossaryTerm[]): Set<string> {
  const seen = new Map<string, string>();
  const duplicateIds = new Set<string>();

  for (const row of terms) {
    const key = normalizeTerm(row.term);
    if (!key) continue;
    const existing = seen.get(key);
    if (existing) {
      duplicateIds.add(existing);
      duplicateIds.add(row.id);
    } else {
      seen.set(key, row.id);
    }
  }
  return duplicateIds;
}

export function GlossaryEditor({ glossary, onSave, onClose }: GlossaryEditorProps) {
  const [terms, setTerms] = useState<GlossaryTerm[]>(() =>
    glossary.terms.map((t) => ({ ...t })),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const duplicateIds = useMemo(() => findDuplicateTermIds(terms), [terms]);

  const filteredTerms = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q),
    );
  }, [terms, searchTerm]);

  const updateTerm = (id: string, patch: Partial<Pick<GlossaryTerm, "term" | "definition">>) => {
    setSaveError(null);
    setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const addTerm = () => {
    setSaveError(null);
    setTerms((prev) => [...prev, { id: newTermId(), term: "", definition: "" }]);
  };

  const removeTerm = (id: string) => {
    setSaveError(null);
    setTerms((prev) => (prev.length <= 1 ? prev : prev.filter((t) => t.id !== id)));
  };

  const handleSave = () => {
    const cleaned = terms.filter((t) => t.term.trim() || t.definition.trim());
    const dupes = findDuplicateTermIds(cleaned);
    if (dupes.size > 0) {
      const names = cleaned
        .filter((t) => dupes.has(t.id))
        .map((t) => t.term.trim())
        .filter(Boolean);
      setSaveError(
        `Duplicate terms are not allowed. Resolve: ${[...new Set(names)].join(", ")}`,
      );
      return;
    }
    setSaveError(null);
    onSave(cleaned);
    onClose();
  };

  return (
    <div className="glossary-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="glossary-editor panel"
        role="dialog"
        aria-labelledby="glossary-editor-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="glossary-editor-header">
          <div>
            <h2 id="glossary-editor-title" className="glossary-editor-title">
              Edit glossary
            </h2>
            <p className="glossary-editor-subtitle">{glossary.name}</p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close editor">
            ✕
          </button>
        </header>

        <p className="glossary-editor-hint">
          Update approved terms and definitions. Terms must be unique (case-insensitive).
        </p>

        <label className="field glossary-search-field">
          <span>Search terms</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by term or definition…"
          />
        </label>

        {duplicateIds.size > 0 && (
          <div className="banner banner-warn" role="status">
            Duplicate terms detected — each term must be unique before saving.
          </div>
        )}

        <div className="glossary-terms-table-wrap">
          <table className="glossary-terms-table">
            <thead>
              <tr>
                <th scope="col">Term</th>
                <th scope="col">Definition</th>
                <th scope="col" className="glossary-terms-actions-col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTerms.length === 0 ? (
                <tr>
                  <td colSpan={3} className="glossary-empty-filter">
                    No terms match your search.
                  </td>
                </tr>
              ) : (
                filteredTerms.map((row) => (
                  <tr
                    key={row.id}
                    className={duplicateIds.has(row.id) ? "glossary-row--duplicate" : undefined}
                  >
                    <td>
                      <input
                        type="text"
                        className={`glossary-term-input${duplicateIds.has(row.id) ? " glossary-input--error" : ""}`}
                        value={row.term}
                        onChange={(e) => updateTerm(row.id, { term: e.target.value })}
                        placeholder="e.g. SKU"
                        aria-invalid={duplicateIds.has(row.id)}
                      />
                    </td>
                    <td>
                      <textarea
                        className="glossary-def-input"
                        value={row.definition}
                        onChange={(e) => updateTerm(row.id, { definition: e.target.value })}
                        placeholder="Definition…"
                        rows={2}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost btn-danger-text"
                        disabled={terms.length <= 1}
                        onClick={() => removeTerm(row.id)}
                        aria-label="Remove term"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button type="button" className="btn-secondary glossary-add-term" onClick={addTerm}>
          + Add term
        </button>

        {saveError && (
          <div className="banner banner-error" role="alert">
            {saveError}
          </div>
        )}

        <footer className="glossary-editor-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={duplicateIds.size > 0}
            onClick={handleSave}
          >
            Save glossary
          </button>
        </footer>
      </div>
    </div>
  );
}
