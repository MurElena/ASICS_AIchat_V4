import { useState } from "react";
import type { User } from "../data/session";
import { saveProfiles, type SavedProfile } from "../data/profiles";

interface SavedProfileCardsProps {
  session: User;
  profiles: SavedProfile[];
  onProfilesChange: (profiles: SavedProfile[]) => void;
  onRunProfile: (profile: SavedProfile) => void;
}

export function SavedProfileCards({
  session,
  profiles,
  onProfilesChange,
  onRunProfile,
}: SavedProfileCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canDelete = session.role !== "simple_user";

  const handleDelete = (profile: SavedProfile) => {
    if (!canDelete) return;
    if (!window.confirm(`Delete profile “${profile.name}”?`)) return;
    const next = profiles.filter((p) => p.id !== profile.id);
    onProfilesChange(next);
    saveProfiles(next);
    if (expandedId === profile.id) setExpandedId(next[0]?.id ?? null);
  };

  if (profiles.length === 0) {
    return (
      <div className="templates-empty panel">
        <p>No saved profiles yet. Launch a generation and enable Save Profile to reuse settings.</p>
      </div>
    );
  }

  return (
    <div className="workflow-card-grid">
      {profiles.map((profile) => {
        const isExpanded = expandedId === profile.id;
        return (
          <article key={profile.id} className="workflow-card panel">
            <div className="workflow-card-head">
              <div className="workflow-card-icon-stack">
                <span className="workflow-card-icon" aria-hidden>
                  <ProfileIcon type={profile.type} />
                </span>
                <span className={`workflow-type-badge workflow-type-badge--${profile.type}`}>
                  {profile.type === "single" ? "Single" : "Multi"}
                </span>
              </div>

              <div className="workflow-card-copy">
                <h2 className="workflow-card-title">{profile.name}</h2>
                <p className="workflow-card-meta">
                  {profile.createdBy} - {profile.createdAt ?? "Apr 2025"}
                </p>
              </div>
            </div>

            <div className="workflow-card-footer">
              <div className="workflow-card-actions">
                <button
                  type="button"
                  className="workflow-icon-action"
                  onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Hide" : "Show"} settings for ${profile.name}`}
                  title={`${isExpanded ? "Hide" : "Show"} settings`}
                >
                  <SettingsToggleIcon expanded={isExpanded} />
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className="workflow-icon-action workflow-icon-action--danger"
                    aria-label={`Delete ${profile.name}`}
                    title="Delete profile"
                    onClick={() => handleDelete(profile)}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn-primary workflow-run-btn"
                onClick={() => onRunProfile(profile)}
              >
                <ArrowIcon /> Run
              </button>
            </div>

            {isExpanded && (
              <div className="workflow-settings-bar">
                <dl className="workflow-settings-list">
                  <div>
                    <dt>Template</dt>
                    <dd>{profile.template}</dd>
                  </div>
                  <div>
                    <dt>Language</dt>
                    <dd>{profile.language}</dd>
                  </div>
                  {profile.type === "single" && (
                    <div>
                      <dt>Length</dt>
                      <dd>{profile.length}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Dictionary</dt>
                    <dd>{profile.dictionary}</dd>
                  </div>
                  <div>
                    <dt>Style Guides</dt>
                    <dd>{profile.styleGuides.join(", ") || "None"}</dd>
                  </div>
                  <div>
                    <dt>Reference content</dt>
                    <dd>{profile.referenceContent.join(", ") || "None"}</dd>
                  </div>
                </dl>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M5 4l14 8-14 8V4z" />
    </svg>
  );
}

function SettingsToggleIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
      {!expanded && <path d="M12 8v8" />}
    </svg>
  );
}

function ProfileIcon({ type }: { type: SavedProfile["type"] }) {
  if (type === "multiproduct") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    );
  }

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8" />
    </svg>
  );
}
