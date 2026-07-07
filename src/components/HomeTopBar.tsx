import { useState } from "react";
import type { User } from "../data/session";
import { IconHistory, IconPlus } from "./Icons";
import { UserMenu, type UserMenuAction } from "./UserMenu";

export type GenerationMode = "ai" | "manual";

interface HomeTopBarProps {
  user: User;
  mode: GenerationMode;
  theme: "light" | "dark";
  onModeChange: (mode: GenerationMode) => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onMenuAction: (action: UserMenuAction) => void;
}

export function HomeTopBar({
  user,
  mode,
  theme,
  onModeChange,
  onNewChat,
  onOpenHistory,
  onMenuAction,
}: HomeTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleAction = (action: UserMenuAction) => {
    setMenuOpen(false);
    onMenuAction(action);
  };

  return (
    <header className="home-topbar">
      <div className="home-topbar-brand">
        <div className="home-topbar-logo" aria-hidden>
          ASICS
        </div>
        <span className="home-topbar-title">Copy studio</span>
      </div>

      <div className="home-topbar-mode" role="group" aria-label="Generation mode">
        <button
          type="button"
          className={`home-topbar-mode-btn${mode === "ai" ? " home-topbar-mode-btn--active" : ""}`}
          aria-pressed={mode === "ai"}
          onClick={() => onModeChange("ai")}
        >
          AI
        </button>
        <button
          type="button"
          className={`home-topbar-mode-btn${mode === "manual" ? " home-topbar-mode-btn--active" : ""}`}
          aria-pressed={mode === "manual"}
          onClick={() => onModeChange("manual")}
        >
          Manual
        </button>
      </div>

      <div className="home-topbar-actions">
        <button type="button" className="home-topbar-new-btn" onClick={onNewChat}>
          <IconPlus size={16} />
          <span>{mode === "manual" ? "New Generation" : "New Generation Chat"}</span>
        </button>
        <button
          type="button"
          className="home-topbar-icon-btn"
          aria-label="Chat history"
          title="Chat history"
          onClick={onOpenHistory}
        >
          <IconHistory size={20} />
        </button>
        <div className="home-topbar-user-wrap">
          <button
            type="button"
            className="home-topbar-avatar"
            aria-label="Open user menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {user.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt="" className="home-topbar-avatar-img" />
            ) : (
              user.initials
            )}
          </button>
          <UserMenu
            user={user}
            theme={theme}
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onAction={handleAction}
          />
        </div>
      </div>
    </header>
  );
}
