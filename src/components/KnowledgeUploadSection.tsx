import { useRef, useState, type ReactNode } from "react";
import type { KnowledgeAsset } from "../data/knowledgeBase";
import { MAX_KNOWLEDGE_FILE_BYTES } from "../data/knowledgeBase";
import { formatFileSize } from "../utils/wizardUtils";

export interface KnowledgeUploadSectionProps<T extends KnowledgeAsset> {
  guidance: ReactNode;
  accept: string;
  allowedExtensions: string[];
  listHeading: string;
  uploadHint: string;
  items: T[];
  searchQuery: string;
  emptyMessage?: string;
  onUpload?: (file: File) => void;
  onDelete: (id: string) => void;
  renderIcon?: () => ReactNode;
  onItemClick?: (item: T) => void;
  itemClickLabel?: string;
  stageUpload?: boolean;
  stagedFile?: File | null;
  onStageFile?: (file: File) => void;
  onClearStaged?: () => void;
  onGenerate?: () => void;
  generateLabel?: string;
  isGenerating?: boolean;
  onTryDemo?: () => void;
  tryDemoLabel?: string;
  onDownloadExample?: () => void;
  exampleFileLabel?: string;
  showGuidance?: boolean;
}

function validateFile(file: File, allowedExtensions: string[]): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    return `Only ${allowedExtensions.map((e) => `.${e}`).join(", ")} files are allowed.`;
  }
  if (file.size > MAX_KNOWLEDGE_FILE_BYTES) {
    return `File exceeds the 20 MB limit (${formatFileSize(file.size)}).`;
  }
  return null;
}

export function KnowledgeUploadSection<T extends KnowledgeAsset>({
  guidance,
  accept,
  allowedExtensions,
  listHeading,
  uploadHint,
  items,
  searchQuery,
  emptyMessage = "No items match your search.",
  onUpload,
  onDelete,
  renderIcon,
  onItemClick,
  itemClickLabel = "Open",
  stageUpload = false,
  stagedFile = null,
  onStageFile,
  onClearStaged,
  onGenerate,
  generateLabel = "Generate",
  isGenerating = false,
  onTryDemo,
  tryDemoLabel = "Try demo",
  onDownloadExample,
  exampleFileLabel = "Example file",
  showGuidance = true,
}: KnowledgeUploadSectionProps<T>) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const q = searchQuery.trim().toLowerCase();
  const filtered = items.filter(
    (item) =>
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q),
  );

  const handleFile = (file: File) => {
    const err = validateFile(file, allowedExtensions);
    if (err) {
      setUploadError(err);
      return;
    }
    setUploadError(null);
    if (stageUpload && onStageFile) {
      onStageFile(file);
      return;
    }
    onUpload?.(file);
  };

  const Icon = renderIcon ?? (() => <DefaultDocIcon />);

  return (
    <>
      {showGuidance && (
        <p className="knowledge-guidance" role="note">
          {guidance}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="upload-input-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      <div
        className={`upload-zone upload-zone--knowledge${dragOver ? " upload-zone--dragover" : ""}`}
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
        <p className="upload-zone-title">Drag &amp; drop files here</p>
        <p className="upload-zone-hint">{uploadHint}</p>
        <div className="upload-zone-actions">
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Browse files
          </button>
          {onDownloadExample && (
            <button type="button" className="btn-link" onClick={onDownloadExample}>
              {exampleFileLabel}
            </button>
          )}
          {onTryDemo && (
            <button type="button" className="btn-link" onClick={onTryDemo} disabled={isGenerating}>
              {tryDemoLabel}
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="banner banner-error" role="alert">
          {uploadError}
        </div>
      )}

      {stagedFile && (
        <div className="knowledge-staged-file panel">
          <div className="knowledge-staged-file-info">
            <p className="knowledge-staged-file-name">{stagedFile.name}</p>
            <p className="knowledge-staged-file-meta">{formatFileSize(stagedFile.size)} · Ready to generate</p>
          </div>
          <div className="knowledge-staged-file-actions">
            {onClearStaged && (
              <button type="button" className="btn-ghost" onClick={onClearStaged} disabled={isGenerating}>
                Remove
              </button>
            )}
            {onGenerate && (
              <button
                type="button"
                className="btn-primary"
                onClick={onGenerate}
                disabled={isGenerating}
              >
                {generateLabel}
              </button>
            )}
          </div>
        </div>
      )}

      <section className="knowledge-file-list" aria-label={listHeading}>
        <h2 className="knowledge-list-heading">{listHeading}</h2>
        {filtered.length === 0 ? (
          <div className="templates-empty panel">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <ul className="knowledge-files">
            {filtered.map((item) => (
              <li key={item.id}>
                <div
                  className={`knowledge-file-row panel${onItemClick ? " knowledge-file-row--clickable" : ""}`}
                  role={onItemClick ? "button" : undefined}
                  tabIndex={onItemClick ? 0 : undefined}
                  onClick={onItemClick ? () => onItemClick(item) : undefined}
                  onKeyDown={
                    onItemClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onItemClick(item);
                          }
                        }
                      : undefined
                  }
                >
                  <div className="knowledge-file-icon" aria-hidden>
                    <Icon />
                  </div>
                  <div className="knowledge-file-info">
                    <p className="knowledge-file-name">{item.name}</p>
                    <p className="knowledge-file-meta">
                      Used in {item.usageCount} generation
                      {item.usageCount === 1 ? "" : "s"}
                      {" · "}
                      Uploaded {item.uploadedAt}
                      {"createdBy" in item && item.createdBy ? ` · ${item.createdBy}` : ""}
                      {onItemClick && (
                        <span className="knowledge-file-edit-hint"> · Click to {itemClickLabel}</span>
                      )}
                    </p>
                  </div>
                  <span className="knowledge-file-label">{item.label}</span>
                  <button
                    type="button"
                    className="knowledge-file-delete"
                    aria-label={`Delete ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function DefaultDocIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function GlossaryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

export function StyleGuideIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
