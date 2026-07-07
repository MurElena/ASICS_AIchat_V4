interface FormatToolbarProps {
  onFormat: (command: string, value?: string) => void;
  disabled?: boolean;
}

function ToolbarBtn({
  label,
  title,
  onClick,
  disabled,
  active,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`format-toolbar-btn${active ? " format-toolbar-btn--active" : ""}`}
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {label}
    </button>
  );
}

export function FormatToolbar({ onFormat, disabled }: FormatToolbarProps) {
  return (
    <div className="format-toolbar" role="toolbar" aria-label="Text formatting">
      <ToolbarBtn label="B" title="Bold" disabled={disabled} onClick={() => onFormat("bold")} />
      <ToolbarBtn label="I" title="Italic" disabled={disabled} onClick={() => onFormat("italic")} />
      <ToolbarBtn label="U" title="Underline" disabled={disabled} onClick={() => onFormat("underline")} />
      <span className="format-toolbar-sep" aria-hidden />
      <ToolbarBtn
        label="H"
        title="Highlight"
        disabled={disabled}
        onClick={() => onFormat("hiliteColor", "#fef08a")}
      />
      <ToolbarBtn
        label="Clr"
        title="Clear highlight"
        disabled={disabled}
        onClick={() => onFormat("hiliteColor", "transparent")}
      />
    </div>
  );
}

export function applyFormatCommand(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}
