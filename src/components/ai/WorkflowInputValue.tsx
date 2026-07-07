import { useState } from "react";
import type { AiGenerationDraft } from "../../data/aiGenerationWorkflow";
import { getInputSummary } from "../../data/aiGenerationWorkflow";

interface WorkflowInputValueProps {
  draft: AiGenerationDraft;
  className?: string;
}

export function WorkflowInputValue({ draft, className }: WorkflowInputValueProps) {
  const { fileNames, typedText } = getInputSummary(draft);
  const [expanded, setExpanded] = useState(false);

  if (fileNames.length === 0 && !typedText) {
    return <span className={className}>Not set</span>;
  }

  return (
    <span className={`workflow-input-value${className ? ` ${className}` : ""}`}>
      {fileNames.length > 0 && (
        <span className="workflow-input-value-files">{fileNames.join(", ")}</span>
      )}
      {typedText && (
        <>
          {fileNames.length > 0 && " · "}
          <button
            type="button"
            className="workflow-input-expand"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide typed input" : "Show typed input"}
          >
            {expanded ? "−" : "+"}
          </button>
          {!expanded && <span className="workflow-input-value-hint">Typed input</span>}
          {expanded && (
            <span className="workflow-input-value-text">{typedText}</span>
          )}
        </>
      )}
    </span>
  );
}
