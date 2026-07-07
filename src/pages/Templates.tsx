import { useMemo, useState } from "react";
import { CreateTemplateWizard } from "../components/CreateTemplateWizard";
import {
  INPUT_TYPE_TAGS,
  LIBRARY_TEMPLATES,
  MODE_TAGS,
  type InputTypeFilter,
  type LibraryTemplate,
  type ModeFilter,
} from "../data/templatesLibrary";

interface TemplatesProps {
  onRunTemplate?: (template: LibraryTemplate) => void;
}

type WizardMode = { type: "create" } | { type: "edit"; template: LibraryTemplate };

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function templateToJson(template: LibraryTemplate): string {
  return JSON.stringify(
    {
      name: template.name,
      description: template.description,
      inputType: template.inputType,
      workflowType: template.workflowType,
      templateFileName: template.templateFileName,
      editorKind: template.editorKind,
    },
    null,
    2,
  );
}

export function Templates({ onRunTemplate }: TemplatesProps) {
  const [wizard, setWizard] = useState<WizardMode | null>(null);
  const [inputTypeFilter, setInputTypeFilter] = useState<InputTypeFilter>("All input types");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("All modes");
  const [templates, setTemplates] = useState(LIBRARY_TEMPLATES);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesInput =
        inputTypeFilter === "All input types" || t.inputType === inputTypeFilter;
      const matchesMode =
        modeFilter === "All modes" || t.workflowType === modeFilter;
      return matchesInput && matchesMode;
    });
  }, [inputTypeFilter, modeFilter, templates]);

  const upsertTemplate = (template: LibraryTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = template;
        return next;
      }
      return [template, ...prev];
    });
  };

  const handleDelete = (template: LibraryTemplate) => {
    if (!window.confirm(`Delete template “${template.name}”?`)) return;
    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
  };

  if (wizard) {
    return (
      <CreateTemplateWizard
        initialTemplate={wizard.type === "edit" ? wizard.template : undefined}
        onCancel={() => setWizard(null)}
        onComplete={({ template }) => {
          upsertTemplate(template);
          setWizard(null);
        }}
      />
    );
  }

  return (
    <div className="templates-page">
      <header className="page-header page-header--with-actions">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">
            Templates are blueprints to give structure to the generations
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-primary" onClick={() => setWizard({ type: "create" })}>
            New template
          </button>
        </div>
      </header>

      <div className="templates-toolbar templates-toolbar--filters-only">
        <select
          className="templates-filter-select"
          value={inputTypeFilter}
          onChange={(e) => setInputTypeFilter(e.target.value as InputTypeFilter)}
          aria-label="Input type"
        >
          {INPUT_TYPE_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          className="templates-filter-select"
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
          aria-label="Generation mode"
        >
          {MODE_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="templates-empty panel">
          <p>No templates match your filters.</p>
        </div>
      ) : (
        <div className="templates-grid">
          {filtered.map((template) => (
            <article key={template.id} className="template-library-card panel">
              <div className="template-library-card-badges">
                <span
                  className={`template-badge template-badge--${template.inputType.toLowerCase()}`}
                >
                  {template.inputType}
                </span>
                <span
                  className={`template-badge template-badge--${template.workflowType === "MULTI" ? "multi" : "single"}`}
                >
                  {template.workflowType}
                </span>
              </div>
              <h2 className="template-library-name">{template.name}</h2>
              {template.description && (
                <p className="template-library-desc">{template.description}</p>
              )}
              <p className="template-library-usage">Used {template.usageCount.toLocaleString()} times</p>

              <div className="template-library-actions">
                <button
                  type="button"
                  className="template-action-btn template-action-btn--primary"
                  onClick={() =>
                    onRunTemplate?.(template) ??
                    window.alert("Open Generate to run a generation from this template.")
                  }
                >
                  <IconPlay />
                  Start
                </button>
                <button
                  type="button"
                  className="template-action-btn"
                  onClick={() => setWizard({ type: "edit", template })}
                >
                  <IconEdit />
                  Edit
                </button>
                <button
                  type="button"
                  className="template-action-btn"
                  onClick={() =>
                    downloadTextFile(
                      `${template.id}.json`,
                      templateToJson(template),
                      "application/json",
                    )
                  }
                >
                  <IconDownload />
                  Download
                </button>
                <button
                  type="button"
                  className="template-action-btn template-action-btn--danger"
                  onClick={() => handleDelete(template)}
                >
                  <IconTrash />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function IconPlay() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
