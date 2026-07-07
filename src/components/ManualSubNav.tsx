import { useEffect, useRef, useState } from "react";
import { IconChevronDown } from "./Icons";

export type ManualTab = "generate" | "configuration";
export type ConfigTab = "templates" | "brand-voice";

interface ManualSubNavProps {
  activeTab: ManualTab;
  configTab: ConfigTab;
  onTabChange: (tab: ManualTab) => void;
  onConfigTabChange: (tab: ConfigTab) => void;
}

export function ManualSubNav({
  activeTab,
  configTab,
  onTabChange,
  onConfigTabChange,
}: ManualSubNavProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configOpen) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setConfigOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [configOpen]);

  const handleConfigSelect = (tab: ConfigTab) => {
    onTabChange("configuration");
    onConfigTabChange(tab);
    setConfigOpen(false);
  };

  return (
    <nav className="manual-subnav" aria-label="Manual mode navigation">
      <button
        type="button"
        className={`manual-subnav-btn${activeTab === "generate" ? " manual-subnav-btn--active" : ""}`}
        onClick={() => {
          setConfigOpen(false);
          onTabChange("generate");
        }}
      >
        Generate
      </button>

      <div className="manual-subnav-dropdown-wrap" ref={wrapRef}>
        <button
          type="button"
          className={`manual-subnav-btn manual-subnav-btn--dropdown${
            activeTab === "configuration" || configOpen ? " manual-subnav-btn--active" : ""
          }`}
          aria-expanded={configOpen}
          aria-haspopup="menu"
          onClick={() => setConfigOpen((open) => !open)}
        >
          Configuration
          <IconChevronDown size={16} />
        </button>
        {configOpen && (
          <div className="manual-subnav-dropdown" role="menu">
            <button
              type="button"
              role="menuitem"
              className={`manual-subnav-dropdown-item${
                configTab === "templates" ? " manual-subnav-dropdown-item--active" : ""
              }`}
              onClick={() => handleConfigSelect("templates")}
            >
              Templates
            </button>
            <button
              type="button"
              role="menuitem"
              className={`manual-subnav-dropdown-item${
                configTab === "brand-voice" ? " manual-subnav-dropdown-item--active" : ""
              }`}
              onClick={() => handleConfigSelect("brand-voice")}
            >
              Brand Voice
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
