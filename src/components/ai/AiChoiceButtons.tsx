import type { AgentChoice } from "../../data/aiGenerationAgent";

interface AiChoiceButtonsProps {
  choices: AgentChoice[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  selectedValues?: string[];
  multiSelect?: boolean;
}

export function AiChoiceButtons({
  choices,
  onSelect,
  disabled,
  selectedValues = [],
  multiSelect = false,
}: AiChoiceButtonsProps) {
  if (choices.length === 0) return null;

  return (
    <div className="ai-choice-buttons" role="group" aria-label="Quick choices">
      {choices.map((choice) => {
        const isAction = choice.value === "none" || choice.value === "done selecting";
        const selected = multiSelect && !isAction && selectedValues.includes(choice.value);

        return (
          <button
            key={choice.id}
            type="button"
            className={`ai-choice-btn${selected ? " ai-choice-btn--selected" : ""}`}
            disabled={disabled}
            aria-pressed={multiSelect && !isAction ? selected : undefined}
            onClick={() => onSelect(choice.value)}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
