import { useRef, useState } from "react";
import {
  INPUT_TYPE_OPTIONS,
  MAX_TEMPLATE_FILE_BYTES,
  slugifyTemplateId,
  TEMPLATE_FILE_ACCEPT,
  type LibraryTemplate,
  type TemplateEditorKind,
  type TemplateInputType,
  type TemplateWorkflowType,
} from "../data/templatesLibrary";
import type { TemplateCell } from "../utils/templateCellFormat";
import {
  cellsFromLegacySections,
  createBlankTemplateBlob,
  defaultCellsForKind,
  loadTemplateFile,
  persistTemplateFile,
  saveTemplateFile,
  templateFileName,
} from "../utils/templateFileUtils";
import { formatFileSize } from "../utils/wizardUtils";
import { IconPenSquare, IconTable, IconFileWord, IconUpload } from "./Icons";
import { TemplateEditor } from "./TemplateEditor";

export interface TemplateWizardResult {
  template: LibraryTemplate;
  mode: "upload" | "editor";
}

interface CreateTemplateWizardProps {
  initialTemplate?: LibraryTemplate;
  variant?: "page" | "modal";
  cancelLabel?: string;
  inheritedInputType?: TemplateInputType;
  inheritedWorkflowType?: TemplateWorkflowType;
  onComplete: (result: TemplateWizardResult) => void;
  onCancel: () => void;
}

function validateTemplateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["docx", "xlsx"].includes(ext)) {
    return "Only DOCX and XLSX template files are allowed.";
  }
  if (file.size > MAX_TEMPLATE_FILE_BYTES) {
    return `File exceeds the 5 MB limit (${formatFileSize(file.size)}).`;
  }
  return null;
}

function RequiredMark() {
  return (
    <span className="field-required" aria-hidden="true">
      *
    </span>
  );
}

export function CreateTemplateWizard({
  initialTemplate,
  variant = "page",
  cancelLabel = "Cancel",
  inheritedInputType,
  inheritedWorkflowType,
  onComplete,
  onCancel,
}: CreateTemplateWizardProps) {
  const isEdit = Boolean(initialTemplate);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftIdRef = useRef(initialTemplate?.editorFileId ?? initialTemplate?.id ?? `draft-${Date.now()}`);

  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [description, setDescription] = useState(initialTemplate?.description ?? "");
  const [inputType, setInputType] = useState<TemplateInputType>(
    initialTemplate?.inputType ?? inheritedInputType ?? "TEXT",
  );
  const [workflowType, setWorkflowType] = useState<TemplateWorkflowType>(
    initialTemplate?.workflowType ?? inheritedWorkflowType ?? "SINGLE",
  );
  const lockInheritedFields = variant === "modal" && !initialTemplate;

  const [showUploadSection, setShowUploadSection] = useState(
    Boolean(initialTemplate?.templateFileName),
  );
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [existingFileName] = useState(initialTemplate?.templateFileName);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [showKindMask, setShowKindMask] = useState(false);
  const [editorKind, setEditorKind] = useState<TemplateEditorKind | null>(
    initialTemplate?.editorKind ?? null,
  );
  const [editorCells, setEditorCells] = useState<TemplateCell[]>(() => {
    if (initialTemplate?.editorSections?.length && initialTemplate.editorKind) {
      return cellsFromLegacySections(initialTemplate.editorSections, initialTemplate.editorKind);
    }
    if (initialTemplate?.editorKind) return defaultCellsForKind(initialTemplate.editorKind);
    return [];
  });
  const [editorFileName, setEditorFileName] = useState(
    initialTemplate?.templateFileName ??
      (initialTemplate?.editorKind && initialTemplate.name
        ? templateFileName(initialTemplate.editorKind, initialTemplate.name)
        : ""),
  );
  const [inEditor, setInEditor] = useState(false);
  const [creatingFile, setCreatingFile] = useState(false);

  const handleFile = (file: File) => {
    const err = validateTemplateFile(file);
    if (err) {
      setFileError(err);
      setTemplateFile(null);
      return;
    }
    setFileError(null);
    setTemplateFile(file);
  };

  const buildTemplate = (overrides?: Partial<LibraryTemplate>): LibraryTemplate => ({
    id: initialTemplate?.id ?? `${slugifyTemplateId(name)}-${Date.now()}`,
    name: name.trim(),
    description: description.trim() || undefined,
    inputType,
    workflowType,
    usageCount: initialTemplate?.usageCount ?? 0,
    templateFileName: editorFileName || templateFile?.name || existingFileName,
    editorKind: editorKind ?? undefined,
    editorFileId: draftIdRef.current,
    ...overrides,
  });

  const canSaveBasics = name.trim().length > 0;

  const handleUploadSave = () => {
    if (!canSaveBasics) return;
    if (showUploadSection && !templateFile && !existingFileName) return;
    onComplete({ template: buildTemplate(), mode: "upload" });
  };

  const handleKindChoice = async (kind: TemplateEditorKind) => {
    setCreatingFile(true);
    try {
      const fileId = draftIdRef.current;
      const fname = templateFileName(kind, name.trim() || "template");
      const blob = await createBlankTemplateBlob(kind);
      await saveTemplateFile({
        id: fileId,
        fileName: fname,
        mimeType: blob.type,
        blob,
        updatedAt: Date.now(),
      });
      setEditorKind(kind);
      setEditorCells(defaultCellsForKind(kind));
      setEditorFileName(fname);
      setShowKindMask(false);
      setInEditor(true);
    } finally {
      setCreatingFile(false);
    }
  };

  const handleEditorSave = async (savedFileName: string) => {
    if (!canSaveBasics || !editorKind) return;
    await persistTemplateFile(draftIdRef.current, editorKind, savedFileName, editorCells);
    onComplete({
      template: buildTemplate({
        editorKind,
        templateFileName: savedFileName,
        editorFileId: draftIdRef.current,
      }),
      mode: "editor",
    });
  };

  const openEditorFromEdit = async () => {
    const kind = editorKind ?? initialTemplate?.editorKind ?? "excel";
    if (!editorKind) setEditorKind(kind);
    if (editorCells.length === 0) {
      setEditorCells(
        initialTemplate?.editorSections?.length
          ? cellsFromLegacySections(initialTemplate.editorSections, kind)
          : defaultCellsForKind(kind),
      );
    }
    const fname = editorFileName || templateFileName(kind, name.trim() || "template");
    if (!editorFileName) setEditorFileName(fname);

    const stored = await loadTemplateFile(draftIdRef.current);
    if (!stored) {
      const blob = await createBlankTemplateBlob(kind);
      await saveTemplateFile({
        id: draftIdRef.current,
        fileName: fname,
        mimeType: blob.type,
        blob,
        updatedAt: Date.now(),
      });
    }
    setInEditor(true);
  };

  if (inEditor && editorKind) {
    return (
      <TemplateEditor
        templateId={draftIdRef.current}
        kind={editorKind}
        templateName={name}
        fileName={editorFileName || templateFileName(editorKind, name.trim() || "template")}
        cells={editorCells}
        onCellsChange={setEditorCells}
        onSave={handleEditorSave}
        onBack={() => setInEditor(false)}
        embedded={variant === "modal"}
      />
    );
  }

  return (
    <div
      className={`create-template-wizard${variant === "modal" ? " create-template-wizard--modal" : " create-template-wizard--wide"}`}
    >
      <header className="page-header page-header--with-actions">
        <div>
          <h1 className="page-title">{isEdit ? "Edit Template" : "New Template"}</h1>
          <p className="page-subtitle">
            {isEdit
              ? "Update template details, upload a file, or open the editor"
              : "Configure your template and upload a file or build one from scratch"}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
      </header>

      <div className="wizard-panel panel">
        <label className="field">
          <span>
            Template name
            <RequiredMark />
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product Description"
            required
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this template is used for…"
            rows={3}
          />
        </label>

        {lockInheritedFields && (inheritedInputType || inheritedWorkflowType) && (
          <p className="create-template-inherited-hint">
            Input type and generation mode are inherited from your chat session.
          </p>
        )}

        <label className="field">
          <span>
            Input type
            <RequiredMark />
          </span>
          <select
            value={inputType}
            onChange={(e) => setInputType(e.target.value as TemplateInputType)}
            disabled={lockInheritedFields && Boolean(inheritedInputType)}
          >
            {INPUT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="wizard-fieldset">
          <legend>
            Generation mode
            <RequiredMark />
          </legend>
          <div className="template-mode-switch" role="group" aria-label="Single or Multi">
            <button
              type="button"
              className={`template-mode-switch-btn${workflowType === "SINGLE" ? " template-mode-switch-btn--active" : ""}`}
              aria-pressed={workflowType === "SINGLE"}
              onClick={() => setWorkflowType("SINGLE")}
              disabled={lockInheritedFields && Boolean(inheritedWorkflowType)}
            >
              Single
            </button>
            <button
              type="button"
              className={`template-mode-switch-btn${workflowType === "MULTI" ? " template-mode-switch-btn--active" : ""}`}
              aria-pressed={workflowType === "MULTI"}
              onClick={() => setWorkflowType("MULTI")}
              disabled={lockInheritedFields && Boolean(inheritedWorkflowType)}
            >
              Multi
            </button>
          </div>
        </fieldset>

        <div className="create-template-paths">
          <button
            type="button"
            className={`create-template-path-card${showUploadSection ? " create-template-path-card--active" : ""}`}
            onClick={() => setShowUploadSection((v) => !v)}
            disabled={!canSaveBasics}
          >
            <span className="create-template-path-icon" aria-hidden>
              <IconUpload size={24} />
            </span>
            <span className="create-template-path-text">
              <strong>Upload template file</strong>
              <span>Use an existing .xlsx or .docx as your starting blueprint (max 5 MB)</span>
            </span>
          </button>
          <button
            type="button"
            className="create-template-path-card"
            onClick={() => setShowKindMask(true)}
            disabled={!canSaveBasics || creatingFile}
          >
            <span className="create-template-path-icon" aria-hidden>
              <IconPenSquare size={24} />
            </span>
            <span className="create-template-path-text">
              <strong>Create template</strong>
              <span>Build a new blank Excel or Word file and edit it in the app</span>
            </span>
          </button>
        </div>

        {showUploadSection && (
          <section className="create-template-upload-section">
            <h2 className="wizard-step-title">Template file upload</h2>
            <p className="wizard-step-desc">Upload your template as DOCX or XLSX (max 5 MB).</p>

            {existingFileName && !templateFile && (
              <p className="create-template-existing-file">
                Current file: <strong>{existingFileName}</strong>
              </p>
            )}

            <div
              className={`upload-zone${dragOver ? " upload-zone--dragover" : ""}${templateFile || existingFileName ? " upload-zone--has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={TEMPLATE_FILE_ACCEPT}
                className="upload-input-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {templateFile ? (
                <div className="upload-file-info">
                  <p className="upload-file-name">{templateFile.name}</p>
                  <p className="upload-file-meta">{formatFileSize(templateFile.size)}</p>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setTemplateFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <>
                  <p className="upload-zone-title">Drag and drop template file</p>
                  <p className="upload-zone-hint">DOCX or XLSX — max 5 MB</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse files
                  </button>
                </>
              )}
            </div>

            {fileError && (
              <div className="banner banner-error" role="alert">
                {fileError}
              </div>
            )}

            <div className="wizard-step-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!canSaveBasics || (!templateFile && !existingFileName)}
                onClick={handleUploadSave}
              >
                Save
              </button>
            </div>
          </section>
        )}

        {isEdit && (
          <div className="wizard-step-actions create-template-edit-footer">
            <button
              type="button"
              className="btn-primary"
              disabled={!canSaveBasics}
              onClick={() => onComplete({ template: buildTemplate(), mode: "upload" })}
            >
              Save
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!canSaveBasics}
              onClick={() => {
                if (editorKind || initialTemplate?.editorKind) {
                  void openEditorFromEdit();
                } else {
                  setShowKindMask(true);
                }
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showKindMask && (
        <div
          className="template-kind-mask"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-kind-title"
        >
          <div className="template-kind-dialog panel">
            <h2 id="template-kind-title" className="template-kind-title">
              What kind of template would you like to create?
            </h2>
            <div className="template-kind-options">
              <button
                type="button"
                className="template-kind-option"
                onClick={() => void handleKindChoice("excel")}
                disabled={creatingFile}
              >
                <span className="template-kind-option-icon" aria-hidden>
                  <IconTable size={28} />
                </span>
                Excel file
              </button>
              <button
                type="button"
                className="template-kind-option"
                onClick={() => void handleKindChoice("word")}
                disabled={creatingFile}
              >
                <span className="template-kind-option-icon" aria-hidden>
                  <IconFileWord size={28} />
                </span>
                Word file
              </button>
            </div>
            {creatingFile && <p className="template-kind-loading">Creating blank file…</p>}
            <button
              type="button"
              className="btn-ghost template-kind-cancel"
              onClick={() => setShowKindMask(false)}
              disabled={creatingFile}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
