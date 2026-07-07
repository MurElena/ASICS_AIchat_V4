import { useEffect, useRef, useState } from "react";
import { generateStyleGuideFromDocument } from "../api/styleGuideGenerate";
import { StyleGuideGenerateModal, StyleGuideGeneratingOverlay } from "../components/StyleGuideGenerateModal";
import {
  createDemoStyleGuideFile,
  DEMO_STYLE_GUIDE_SOURCE,
} from "../data/styleGuideDemo";
import { extractKnowledgeFileText } from "../utils/knowledgeFileUtils";
import { GlossaryEditor } from "../components/GlossaryEditor";
import {
  GlossaryIcon,
  KnowledgeUploadSection,
  StyleGuideIcon,
} from "../components/KnowledgeUploadSection";
import { IconSearch } from "../components/Icons";
import {
  EXAMPLE_GLOSSARY_CSV,
  EXAMPLE_KNOWLEDGE_FILE_CONTENT,
  EXAMPLE_STYLE_GUIDE_CONTENT,
  GLOSSARY_FILE_ACCEPT,
  KNOWLEDGE_FILE_ACCEPT,
  MOCK_GLOSSARIES,
  MOCK_KNOWLEDGE_FILES,
  STYLE_GUIDE_ACCEPT,
  newTermId,
  type Glossary,
  type GlossaryTerm,
  type KnowledgeAsset,
  type KnowledgeFile,
  type KnowledgeTab,
  type StyleGuide,
} from "../data/knowledgeBase";
import { loadStyleGuides, saveStyleGuides } from "../data/styleGuidesStore";

const TAB_USAGE: Record<KnowledgeTab, string> = {
  dictionaries:
    "Dictionaries control approved terminology, product glossaries, and localized terms used during generation.",
  "style-guides":
    "Style guides steer tone, formatting, and brand voice across generated content.",
  "reference-content":
    "Reference content provides source material such as brand guides, product specifications, and campaign briefs.",
};

const TABS: { id: KnowledgeTab; label: string }[] = [
  { id: "dictionaries", label: "Dictionaries" },
  { id: "style-guides", label: "Style Guides" },
  { id: "reference-content", label: "Reference content" },
];

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface KnowledgeBaseProps {
  variant?: "knowledge" | "brand-voice";
  initialTab?: KnowledgeTab;
}

export function KnowledgeBase({ variant = "knowledge", initialTab = "dictionaries" }: KnowledgeBaseProps) {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>(initialTab);
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<KnowledgeFile[]>(MOCK_KNOWLEDGE_FILES);
  const [glossaries, setGlossaries] = useState<Glossary[]>(MOCK_GLOSSARIES);
  const [styleGuides, setStyleGuides] = useState<StyleGuide[]>(() => loadStyleGuides());
  const [editingGlossary, setEditingGlossary] = useState<Glossary | null>(null);
  const [previewAsset, setPreviewAsset] = useState<KnowledgeAsset | null>(null);
  const [stagedStyleGuideFile, setStagedStyleGuideFile] = useState<File | null>(null);
  const [isGeneratingStyleGuide, setIsGeneratingStyleGuide] = useState(false);
  const [styleGuideGenerateError, setStyleGuideGenerateError] = useState<string | null>(null);
  const [generatedStyleGuideDraft, setGeneratedStyleGuideDraft] = useState<{
    name: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const filesInputRef = useRef<HTMLInputElement>(null);
  const glossaryInputRef = useRef<HTMLInputElement>(null);
  const styleGuideInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    if (activeTab === "reference-content") filesInputRef.current?.click();
    else if (activeTab === "dictionaries") glossaryInputRef.current?.click();
    else styleGuideInputRef.current?.click();
  };

  const downloadExample = () => {
    if (activeTab === "reference-content") downloadText("knowledge-base-example.txt", EXAMPLE_KNOWLEDGE_FILE_CONTENT);
    else if (activeTab === "dictionaries") downloadText("glossary-example.csv", EXAMPLE_GLOSSARY_CSV);
    else downloadText("style-guide-example.txt", EXAMPLE_STYLE_GUIDE_CONTENT);
  };

  const uploadLabel =
    activeTab === "reference-content"
      ? "Upload Reference Content"
      : activeTab === "dictionaries"
        ? "Upload Glossary"
        : "Upload Style Guide";

  const deleteFile = (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item || !window.confirm(`Remove “${item.name}” from the knowledge base?`)) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const deleteGlossary = (id: string) => {
    const item = glossaries.find((g) => g.id === id);
    if (!item || !window.confirm(`Remove glossary “${item.name}”?`)) return;
    setGlossaries((prev) => prev.filter((g) => g.id !== id));
    if (editingGlossary?.id === id) setEditingGlossary(null);
  };

  const deleteStyleGuide = (id: string) => {
    const item = styleGuides.find((s) => s.id === id);
    if (!item || !window.confirm(`Remove “${item.name}”?`)) return;
    setStyleGuides((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveStyleGuides(next);
      return next;
    });
  };

  const addFile = (file: File) => {
    setFiles((prev) => [
      {
        id: `kb-${Date.now()}`,
        name: file.name,
        usageCount: 0,
        label: "Reference content",
        uploadedAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
  };

  const addGlossary = (file: File) => {
    setGlossaries((prev) => [
      {
        id: `g-${Date.now()}`,
        name: file.name,
        usageCount: 0,
        label: "Glossary",
        uploadedAt: new Date().toISOString().slice(0, 10),
        terms: [{ id: newTermId(), term: "", definition: "" }],
      },
      ...prev,
    ]);
  };

  const addStyleGuide = (name: string, content: string, createdBy?: string) => {
    const guide: StyleGuide = {
      id: `sg-${Date.now()}`,
      name,
      usageCount: 0,
      label: "Style guide",
      uploadedAt: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
      content,
      createdBy,
    };
    setStyleGuides((prev) => {
      const next = [guide, ...prev];
      saveStyleGuides(next);
      return next;
    });
  };

  const stageStyleGuideFile = (file: File) => {
    setStyleGuideGenerateError(null);
    setStagedStyleGuideFile(file);
  };

  const clearStagedStyleGuideFile = () => {
    setStagedStyleGuideFile(null);
    setStyleGuideGenerateError(null);
  };

  const handleGenerateStyleGuide = async () => {
    if (!stagedStyleGuideFile || isGeneratingStyleGuide) return;

    setIsGeneratingStyleGuide(true);
    setStyleGuideGenerateError(null);

    try {
      const fileContent = await extractKnowledgeFileText(stagedStyleGuideFile);
      const result = await generateStyleGuideFromDocument({
        fileName: stagedStyleGuideFile.name,
        fileContent,
      });
      setGeneratedStyleGuideDraft({
        name: result.name,
        content: result.content,
      });
    } catch (err) {
      setStyleGuideGenerateError(
        err instanceof Error ? err.message : "Could not generate style guide.",
      );
    } finally {
      setIsGeneratingStyleGuide(false);
    }
  };

  const tryStyleGuideDemo = async () => {
    const demoFile = createDemoStyleGuideFile();
    setStyleGuideGenerateError(null);
    setStagedStyleGuideFile(demoFile);
    setIsGeneratingStyleGuide(true);

    try {
      const result = await generateStyleGuideFromDocument({
        fileName: demoFile.name,
        fileContent: DEMO_STYLE_GUIDE_SOURCE,
        forceDemo: true,
      });
      setGeneratedStyleGuideDraft({
        name: result.name,
        content: result.content,
      });
    } catch (err) {
      setStyleGuideGenerateError(
        err instanceof Error ? err.message : "Could not generate style guide.",
      );
    } finally {
      setIsGeneratingStyleGuide(false);
    }
  };

  const saveGeneratedStyleGuide = (name: string, content: string) => {
    addStyleGuide(name, content);
    setGeneratedStyleGuideDraft(null);
    setStagedStyleGuideFile(null);
    setStyleGuideGenerateError(null);
  };

  const saveGlossaryTerms = (glossaryId: string, terms: GlossaryTerm[]) => {
    setGlossaries((prev) =>
      prev.map((g) => (g.id === glossaryId ? { ...g, terms } : g)),
    );
  };

  const downloadAsset = (asset: KnowledgeAsset) => {
    downloadText(
      `${asset.name.replace(/\.[^.]+$/, "")}-preview.txt`,
      `${asset.name}\nUploaded: ${asset.uploadedAt}\nUsed in ${asset.usageCount} generations\n\nDemo preview export for ${asset.label.toLowerCase()}.`,
    );
  };

  const isBrandVoice = variant === "brand-voice";

  return (
    <div className="knowledge-page">
      <header className="page-header page-header--with-actions">
        <div>
          <h1 className="page-title">
            {isBrandVoice ? "Brand Voice" : "Knowledge Base"}
          </h1>
          {!isBrandVoice && (
            <p className="page-subtitle">
              Documents, dictionaries, and style guides for guided generation
            </p>
          )}
        </div>
        <div className="page-header-actions knowledge-header-actions">
          {!isBrandVoice && (
            <div className="knowledge-search-inline">
              <IconSearch size={18} className="templates-search-icon" />
              <input
                type="search"
                className="templates-search-input"
                placeholder="Search knowledge…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search knowledge assets"
              />
            </div>
          )}
          {!isBrandVoice && (
            <button type="button" className="btn-link" onClick={downloadExample}>
              Example file
            </button>
          )}
          <button type="button" className="btn-primary" onClick={triggerUpload}>
            {uploadLabel}
          </button>
        </div>
      </header>

      <div className="knowledge-tabs" role="tablist" aria-label="Knowledge asset types">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`template-tab${activeTab === tab.id ? " template-tab--active" : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              setEditingGlossary(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hidden inputs for header upload button */}
      <input
        ref={filesInputRef}
        type="file"
        accept={KNOWLEDGE_FILE_ACCEPT}
        className="upload-input-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) addFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={glossaryInputRef}
        type="file"
        accept={GLOSSARY_FILE_ACCEPT}
        className="upload-input-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) addGlossary(file);
          e.target.value = "";
        }}
      />
      <input
        ref={styleGuideInputRef}
        type="file"
        accept={STYLE_GUIDE_ACCEPT}
        className="upload-input-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) stageStyleGuideFile(file);
          e.target.value = "";
        }}
      />

      <div className="brand-voice-info-card panel">
        <h2>{isBrandVoice ? "How is this used?" : "How these materials are used"}</h2>
        <p>{TAB_USAGE[activeTab]}</p>
      </div>

      {activeTab === "reference-content" && (
        <KnowledgeUploadSection
          guidance={
            <>
              <strong>Accepted formats:</strong> .pdf, .docx, .txt · <strong>Max size:</strong> 20 MB
              per file · Use for brand guides, product specs, and campaign documents.
            </>
          }
          accept={KNOWLEDGE_FILE_ACCEPT}
          allowedExtensions={["pdf", "docx", "txt"]}
          listHeading={isBrandVoice ? "Reference content" : "Uploaded reference content"}
          uploadHint="PDF, DOCX, TXT — max 20 MB per file"
          items={files}
          searchQuery={isBrandVoice ? "" : search}
          onUpload={addFile}
          onDelete={deleteFile}
          onItemClick={(asset) => setPreviewAsset(asset)}
          itemClickLabel="preview"
          onDownloadExample={isBrandVoice ? downloadExample : undefined}
          showGuidance={!isBrandVoice}
        />
      )}

      {activeTab === "dictionaries" && (
        <KnowledgeUploadSection
          guidance={
            <>
              <strong>Accepted formats:</strong> .csv, .json, .txt · <strong>Max size:</strong> 20 MB
              per file · Use for approved terminology, product glossaries, and localized terms.
            </>
          }
          accept={GLOSSARY_FILE_ACCEPT}
          allowedExtensions={["csv", "json", "txt"]}
          listHeading={isBrandVoice ? "Dictionaries" : "Uploaded glossaries"}
          uploadHint="CSV, JSON, TXT — max 20 MB per file"
          items={glossaries}
          searchQuery={isBrandVoice ? "" : search}
          emptyMessage="No glossaries match your search."
          onUpload={addGlossary}
          onDelete={deleteGlossary}
          renderIcon={GlossaryIcon}
          onItemClick={(g) => setEditingGlossary(g)}
          itemClickLabel="edit terms"
          onDownloadExample={isBrandVoice ? downloadExample : undefined}
          showGuidance={!isBrandVoice}
        />
      )}

      {activeTab === "style-guides" && (
        <KnowledgeUploadSection
          guidance={
            <>
              <strong>Accepted formats:</strong> .pdf, .docx, .txt · <strong>Max size:</strong> 20 MB
              per file.
            </>
          }
          accept={STYLE_GUIDE_ACCEPT}
          allowedExtensions={["pdf", "docx", "txt"]}
          listHeading={isBrandVoice ? "Style guides" : "Available style guides"}
          uploadHint="PDF, DOCX, TXT — max 20 MB per file"
          items={styleGuides}
          searchQuery={isBrandVoice ? "" : search}
          emptyMessage="No style guides match your search."
          stageUpload
          stagedFile={stagedStyleGuideFile}
          onStageFile={stageStyleGuideFile}
          onClearStaged={clearStagedStyleGuideFile}
          onGenerate={() => void handleGenerateStyleGuide()}
          generateLabel="Generate style guide"
          isGenerating={isGeneratingStyleGuide}
          onTryDemo={() => void tryStyleGuideDemo()}
          tryDemoLabel="Try demo"
          onDelete={deleteStyleGuide}
          renderIcon={StyleGuideIcon}
          onItemClick={(asset) => setPreviewAsset(asset)}
          itemClickLabel="preview"
          onDownloadExample={isBrandVoice ? downloadExample : undefined}
          showGuidance={!isBrandVoice}
        />
      )}

      {styleGuideGenerateError && (
        <div className="banner banner-error" role="alert">
          {styleGuideGenerateError}
        </div>
      )}

      {isGeneratingStyleGuide && stagedStyleGuideFile && (
        <StyleGuideGeneratingOverlay fileName={stagedStyleGuideFile.name} />
      )}

      {generatedStyleGuideDraft && (
        <StyleGuideGenerateModal
          initialName={generatedStyleGuideDraft.name}
          initialContent={generatedStyleGuideDraft.content}
          onClose={() => setGeneratedStyleGuideDraft(null)}
          onSave={saveGeneratedStyleGuide}
        />
      )}

      {editingGlossary && (
        <GlossaryEditor
          glossary={glossaries.find((g) => g.id === editingGlossary.id) ?? editingGlossary}
          onClose={() => setEditingGlossary(null)}
          onSave={(terms) => saveGlossaryTerms(editingGlossary.id, terms)}
        />
      )}

      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
          onDownload={() => downloadAsset(previewAsset)}
        />
      )}
    </div>
  );
}

function AssetPreviewModal({
  asset,
  onClose,
  onDownload,
}: {
  asset: KnowledgeAsset & { content?: string };
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="glossary-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="asset-preview-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="glossary-editor-header">
          <div>
            <h2 id="asset-preview-title" className="glossary-editor-title">
              {asset.name}
            </h2>
            <p className="glossary-editor-subtitle">
              {asset.label} · Uploaded {asset.uploadedAt} · Used in {asset.usageCount} generation
              {asset.usageCount === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close preview">
            ✕
          </button>
        </header>

        <div className="asset-preview-body">
          <p className="asset-preview-kicker">Preview</p>
          <div className="asset-preview-page">
            {"content" in asset && asset.content ? (
              <pre className="asset-preview-content">{asset.content}</pre>
            ) : (
              <>
                <h3>{asset.name.replace(/\.[^.]+$/, "")}</h3>
                <p>
                  This demo preview represents the uploaded {asset.label.toLowerCase()} content.
                  In production, the document text, extracted structure, and metadata would be shown here.
                </p>
                <ul>
                  <li>Purpose: guide generated copy with approved source material.</li>
                  <li>Governance: reusable across profiles and tracked by usage count.</li>
                  <li>Upload date: {asset.uploadedAt}</li>
                </ul>
              </>
            )}
          </div>
        </div>

        <footer className="glossary-editor-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={onDownload}>
            Download
          </button>
        </footer>
      </div>
    </div>
  );
}
