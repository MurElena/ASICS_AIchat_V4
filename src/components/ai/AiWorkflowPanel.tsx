import type { CSSProperties, ReactNode } from "react";
import {
  type AiGenerationDraft,
  type WorkflowFieldId,
  WORKFLOW_FIELDS,
  getCompletedWorkflowFields,
  getFieldDisplayValue,
  isFieldComplete,
} from "../../data/aiGenerationWorkflow";
import { WorkflowInputValue } from "./WorkflowInputValue";

interface AiWorkflowPanelProps {
  draft: AiGenerationDraft;
  activeFieldId: WorkflowFieldId;
  onStepClick: (fieldId: WorkflowFieldId) => void;
}

export function AiWorkflowPanel({ draft, activeFieldId, onStepClick }: AiWorkflowPanelProps) {
  const completedFields = getCompletedWorkflowFields(draft);
  const visibleIds = new Set(completedFields.map((f) => f.id));

  if (draft.awaitingProfileConfirmation || draft.awaitingStepSelection) {
    WORKFLOW_FIELDS.forEach((f) => {
      if (f.id !== "confirm" && isFieldComplete(draft, f.id)) {
        visibleIds.add(f.id);
      }
    });
  }

  const visibleFields = WORKFLOW_FIELDS.filter((f) => visibleIds.has(f.id));

  return (
    <aside
      className={`ai-workflow-tree${draft.awaitingStepSelection ? " ai-workflow-tree--pick-step" : ""}`}
      aria-label="Generation workflow"
    >
      <div className="ai-workflow-tree-root">
        <WorkflowIcon id="agent" color="#3b82f6" />
        <span className="ai-workflow-tree-root-label">Agent</span>
      </div>

      {visibleFields.length > 0 && (
        <ol className="ai-workflow-tree-branch">
          {visibleFields.map((field, index) => {
            const value = getFieldDisplayValue(draft, field.id);
            const isLast = index === visibleFields.length - 1;
            const isActive = field.id === activeFieldId || draft.editingFieldId === field.id;
            const isClickable = field.id !== "confirm";
            const pickStep = draft.awaitingStepSelection && isClickable;

            return (
              <li
                key={field.id}
                className={`ai-workflow-tree-node${isActive ? " ai-workflow-tree-node--active" : ""}${pickStep ? " ai-workflow-tree-node--pickable" : ""}`}
                style={{ "--step-color": field.color } as CSSProperties}
              >
                <div className="ai-workflow-tree-rail" aria-hidden>
                  <span className="ai-workflow-tree-rail-elbow" />
                  {!isLast && <span className="ai-workflow-tree-rail-line" />}
                </div>
                {isClickable ? (
                  <button
                    type="button"
                    className="ai-workflow-tree-node-btn"
                    onClick={() => onStepClick(field.id)}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <WorkflowNodeContent draft={draft} field={field} value={value} />
                  </button>
                ) : (
                  <div className="ai-workflow-tree-node-content">
                    <WorkflowNodeContent draft={draft} field={field} value={value} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

function WorkflowNodeContent({
  draft,
  field,
  value,
}: {
  draft: AiGenerationDraft;
  field: { id: WorkflowFieldId; label: string; color: string };
  value: string;
}) {
  return (
    <>
      <WorkflowIcon id={field.id} color={field.color} />
      <div className="ai-workflow-tree-node-text">
        <span className="ai-workflow-tree-node-label">{field.label}</span>
        <span className="ai-workflow-tree-node-value">
          {field.id === "input" ? <WorkflowInputValue draft={draft} /> : value}
        </span>
      </div>
    </>
  );
}

function WorkflowIcon({ id, color }: { id: WorkflowFieldId | "agent"; color: string }) {
  const icons: Record<WorkflowFieldId | "agent", ReactNode> = {
    agent: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="8" width="14" height="11" rx="2" stroke={color} strokeWidth="1.75" />
        <circle cx="9.5" cy="13" r="1" fill={color} />
        <circle cx="14.5" cy="13" r="1" fill={color} />
        <path d="M12 4v4M8 6l2 2M16 6l-2 2" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    input: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="1.75" />
        <path d="M14 2v6h6M12 18v-6M9 15h6" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    generationType: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 6h12M6 12h12M6 18h8" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="4" cy="6" r="1" fill={color} />
        <circle cx="4" cy="12" r="1" fill={color} />
        <circle cx="4" cy="18" r="1" fill={color} />
      </svg>
    ),
    template: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="1.75" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    language: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke={color} strokeWidth="1.75" />
      </svg>
    ),
    maxLength: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7h16M4 12h10M4 17h14" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    glossaries: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke={color} strokeWidth="1.75" />
      </svg>
    ),
    styleGuide: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          stroke={color}
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    ),
    referenceContent: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
        <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.75" />
      </svg>
    ),
    confirm: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" />
        <path d="M8 12l2.5 2.5L16 9" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  };

  return <span className="ai-workflow-tree-icon">{icons[id]}</span>;
}
