import { useEffect, useRef, useState } from "react";
import { LIBRARY_TEMPLATES, type TemplateInputType } from "../data/templatesLibrary";
import { buildGenerationOutput } from "../data/generationOutput";
import type { GenerationOutput } from "../data/generationOutput";
import { createDemoCatalogUploadFile } from "../data/generationOutput";
import {
  DEMO_EXCEL_PROFILE_ID,
  DEMO_PROFILE_ID,
  DEMO_SOURCE_TEXT,
  type SavedProfile,
} from "../data/profiles";
import { ACCEPTED_FILE_TYPES, PRODUCT_TEMPLATES, SINGLE_TEMPLATES } from "../data/wizardConfig";
import { formatFileSize, validateUploadFile } from "../utils/wizardUtils";

interface GenerationRunProps {
  profile: SavedProfile;
  onBack: () => void;
  onGenerated: (output: GenerationOutput) => void;
}

interface ProfileTemplateMeta {
  description: string;
  inputType: TemplateInputType;
}

const TEMPLATE_INPUT_OVERRIDES: Partial<Record<string, TemplateInputType>> = {
  "Standard Product Description": "FILE",
  "Marketplace Listing": "FILE",
  "Technical Datasheet": "FILE",
  "SEO Meta Pack": "FILE",
};

function getProfileTemplateMeta(profile: SavedProfile): ProfileTemplateMeta {
  const libraryTemplate = LIBRARY_TEMPLATES.find((template) => template.name === profile.template);
  const wizardTemplate = [...SINGLE_TEMPLATES, ...PRODUCT_TEMPLATES].find(
    (template) => template.name === profile.template,
  );

  return {
    description:
      libraryTemplate?.description ??
      wizardTemplate?.description ??
      `${profile.template} profile configured for ${profile.language} output.`,
    inputType:
      TEMPLATE_INPUT_OVERRIDES[profile.template] ??
      libraryTemplate?.inputType ??
      (profile.type === "multiproduct" ? "FILE" : "TEXT"),
  };
}

export function GenerationRun({ profile, onBack, onGenerated }: GenerationRunProps) {
  const templateMeta = getProfileTemplateMeta(profile);
  const [textInput, setTextInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (templateMeta.inputType === "TEXT" && profile.id === DEMO_PROFILE_ID) {
      setTextInput(DEMO_SOURCE_TEXT);
    }
  }, [profile.id, templateMeta.inputType]);

  useEffect(() => {
    if (profile.id !== DEMO_EXCEL_PROFILE_ID || uploadedFile) return;
    let cancelled = false;
    void createDemoCatalogUploadFile().then((file) => {
      if (!cancelled) setUploadedFile(file);
    });
    return () => {
      cancelled = true;
    };
  }, [profile.id, uploadedFile]);

  const handleFile = (file: File) => {
    const error = validateUploadFile(file);
    if (error) {
      setFileError(error);
      setUploadedFile(null);
      return;
    }
    setFileError(null);
    setUploadedFile(file);
  };

  const canRun =
    templateMeta.inputType === "TEXT" ? textInput.trim().length > 0 : uploadedFile !== null && !fileError;

  const handleRun = () => {
    if (!canRun || running) return;
    setRunning(true);
    window.setTimeout(() => {
      const source =
        templateMeta.inputType === "TEXT"
          ? textInput
          : uploadedFile
            ? `Uploaded file: ${uploadedFile.name}`
            : "";
      onGenerated(buildGenerationOutput(profile, source));
      setRunning(false);
    }, 1400);
  };

  return (
    <div className="workflow-run-page app-page-inner">
      <header className="page-header page-header--with-actions">
        <div>
          <h1 className="page-title">{profile.name}</h1>
          <p className="page-subtitle">{templateMeta.description}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back to Generate
        </button>
      </header>

      <div className="workflow-run-layout">
        <section className="panel workflow-run-input-card">
          <div className="linked-template-notice" role="status">
            <span className="template-badge template-badge--workflow">{profile.template}</span>
            <span className={`template-badge template-badge--${templateMeta.inputType.toLowerCase()}`}>
              {templateMeta.inputType} input
            </span>
            {profile.id === DEMO_EXCEL_PROFILE_ID && (
              <span className="template-badge template-badge--multi">Excel output</span>
            )}
          </div>

          {templateMeta.inputType === "TEXT" ? (
            <label className="field workflow-run-field">
              <span>Source text</span>
              <textarea
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                placeholder="Paste the brief, source material, product notes, or campaign context..."
                rows={12}
              />
            </label>
          ) : (
            <>
              <div
                className={`upload-zone${dragOver ? " upload-zone--dragover" : ""}${
                  uploadedFile ? " upload-zone--has-file" : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = event.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  className="upload-input-hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                {uploadedFile ? (
                  <div className="upload-file-info">
                    <p className="upload-file-name">{uploadedFile.name}</p>
                    <p className="upload-file-meta">{formatFileSize(uploadedFile.size)}</p>
                    {profile.id === DEMO_EXCEL_PROFILE_ID && (
                      <p className="upload-file-meta">Demo catalog — generation will export as Excel</p>
                    )}
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setUploadedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="upload-zone-title">Drag and drop your file here</p>
                    <p className="upload-zone-hint">PDF, DOCX, TXT, XLSX - max 20 MB</p>
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
                <div className="banner banner-error workflow-run-error" role="alert">
                  {fileError}
                </div>
              )}
            </>
          )}

          <div className="workflow-run-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={!canRun || running}
              onClick={handleRun}
            >
              {running ? "Generating…" : "Run Generation"}
            </button>
          </div>
        </section>

        <aside className="panel workflow-run-summary" aria-label="Profile settings summary">
          <h2>Profile settings</h2>
          <dl className="workflow-run-settings-list">
            <div>
              <dt>Profile type</dt>
              <dd>{profile.type === "single" ? "Single" : "Multiproduct"}</dd>
            </div>
            <div>
              <dt>Template</dt>
              <dd>{profile.template}</dd>
            </div>
            <div>
              <dt>Input</dt>
              <dd>{templateMeta.inputType === "TEXT" ? "Typing box" : "File upload"}</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>{profile.id === DEMO_EXCEL_PROFILE_ID ? "Excel (.xlsx)" : "Document (text)"}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{profile.language}</dd>
            </div>
            {profile.type === "single" && (
              <div>
                <dt>Length</dt>
                <dd>{profile.length}</dd>
              </div>
            )}
            <div>
              <dt>Dictionary</dt>
              <dd>{profile.dictionary}</dd>
            </div>
            <div>
              <dt>Style guides</dt>
              <dd>{profile.styleGuides.join(", ") || "None"}</dd>
            </div>
            <div>
              <dt>Reference content</dt>
              <dd>{profile.referenceContent.join(", ") || "None"}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
