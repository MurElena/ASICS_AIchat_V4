import { useEffect, useRef } from "react";
import type { User } from "../data/session";
import { IconMoon, IconSun } from "./Icons";

export type UserMenuAction =
  | "toggle-theme"
  | "account"
  | "admin"
  | "statistics"
  | "documentation"
  | "logout";

interface UserMenuProps {
  user: User;
  theme: "light" | "dark";
  open: boolean;
  onClose: () => void;
  onAction: (action: UserMenuAction) => void;
}

export function UserMenu({ user, theme, open, onClose, onAction }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="user-menu" ref={menuRef} role="menu">
      <div className="user-menu-header">
        <span className="user-menu-name">{user.name}</span>
        <span className="user-menu-email">{user.email}</span>
      </div>

      <button
        type="button"
        className="user-menu-item user-menu-item--switch"
        role="menuitem"
        onClick={() => onAction("toggle-theme")}
      >
        <span className="user-menu-item-label">
          {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
          {theme === "light" ? "Dark mode" : "Light mode"}
        </span>
        <span className="user-menu-switch" aria-hidden>
          <span className={`user-menu-switch-thumb user-menu-switch-thumb--${theme}`} />
        </span>
      </button>

      <div className="user-menu-divider" />

      <button
        type="button"
        className="user-menu-item"
        role="menuitem"
        onClick={() => onAction("account")}
      >
        User account
      </button>

      <button
        type="button"
        className="user-menu-item"
        role="menuitem"
        onClick={() => onAction("admin")}
      >
        Admin
      </button>

      <button
        type="button"
        className="user-menu-item"
        role="menuitem"
        onClick={() => onAction("statistics")}
      >
        Statistics
      </button>

      <button
        type="button"
        className="user-menu-item"
        role="menuitem"
        onClick={() => onAction("documentation")}
      >
        Documentation
      </button>

      <div className="user-menu-divider" />

      <button
        type="button"
        className="user-menu-item user-menu-item--danger"
        role="menuitem"
        onClick={() => onAction("logout")}
      >
        Log-out
      </button>
    </div>
  );
}
