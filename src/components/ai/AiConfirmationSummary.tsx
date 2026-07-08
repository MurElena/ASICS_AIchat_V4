import type { ReactNode } from "react";
import type { AiGenerationDraft } from "../../data/aiGenerationWorkflow";
import { getFieldDisplayValue } from "../../data/aiGenerationWorkflow";
import { WorkflowInputValue } from "./WorkflowInputValue";

interface AiConfirmationSummaryProps {
  draft: AiGenerationDraft;
  excludeInput?: boolean;
}

export function AiConfirmationSummary({ draft, excludeInput }: AiConfirmationSummaryProps) {
  const rows: { label: string; value: ReactNode }[] = [
    { label: "Type", value: getFieldDisplayValue(draft, "generationType") },
    { label: "Template", value: getFieldDisplayValue(draft, "template") },
    { label: "Language", value: getFieldDisplayValue(draft, "language") },
    { label: "Max length", value: getFieldDisplayValue(draft, "maxLength") },
    { label: "Glossaries", value: getFieldDisplayValue(draft, "glossaries") },
    { label: "Style guide", value: getFieldDisplayValue(draft, "styleGuide") },
    { label: "Reference content", value: getFieldDisplayValue(draft, "referenceContent") },
    ...(excludeInput
      ? []
      : [{ label: "Context input", value: <WorkflowInputValue draft={draft} /> }]),
  ];

  return (
    <div className="ai-confirmation-summary">
      <ul className="ai-confirmation-summary-list">
        {rows.map((row) => (
          <li key={row.label} className="ai-confirmation-summary-row">
            <span className="ai-confirmation-summary-label">{row.label}</span>
            <span className="ai-confirmation-summary-value">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
