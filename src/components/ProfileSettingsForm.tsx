import { useState } from "react";
import {
  getProfileStyleGuideOptions,
  newProfileDefaults,
  PROFILE_TEMPLATE_OPTIONS,
  type ProfileType,
  type SavedProfile,
} from "../data/profiles";
import { formatUserStyleGuideName } from "../data/styleGuidesStore";
import {
  DICTIONARIES,
  OUTPUT_LANGUAGES,
  OUTPUT_LENGTHS,
  REFERENCE_DOCUMENTS,
} from "../data/wizardConfig";

export interface ProfileSettingsFormProps {
  sessionName: string;
  draft: SavedProfile;
  profileType: ProfileType;
  onDraftChange: (draft: SavedProfile) => void;
  onProfileTypeChange: (type: ProfileType) => void;
  saveProfile?: boolean;
  onSaveProfileChange?: (checked: boolean) => void;
  profileName?: string;
  onProfileNameChange?: (name: string) => void;
  footerMessage?: string | null;
  onPrimaryAction: () => void;
  primaryLabel: string;
}

export function ProfileSettingsForm({
  sessionName,
  draft,
  profileType,
  onDraftChange,
  onProfileTypeChange,
  saveProfile = false,
  onSaveProfileChange,
  profileName = "",
  onProfileNameChange,
  footerMessage,
  onPrimaryAction,
  primaryLabel,
}: ProfileSettingsFormProps) {
  const personalStyleGuide = formatUserStyleGuideName(sessionName);
  const styleGuideOptions = getProfileStyleGuideOptions(sessionName);

  const switchType = (type: ProfileType) => {
    onProfileTypeChange(type);
    onDraftChange({ ...newProfileDefaults(sessionName, type), name: draft.name });
  };

  const updateList = (field: "styleGuides" | "referenceContent", value: string, checked: boolean) => {
    const set = new Set(draft[field]);
    if (checked) set.add(value);
    else set.delete(value);
    onDraftChange({ ...draft, [field]: [...set] });
  };

  return (
    <section className="workflow-config">
      <div className="workflow-config-tabs" role="tablist">
        <button
          type="button"
          className={`template-tab${profileType === "single" ? " template-tab--active" : ""}`}
          aria-selected={profileType === "single"}
          onClick={() => switchType("single")}
        >
          Single
        </button>
        <button
          type="button"
          className={`template-tab${profileType === "multiproduct" ? " template-tab--active" : ""}`}
          aria-selected={profileType === "multiproduct"}
          onClick={() => switchType("multiproduct")}
        >
          Multiproduct
        </button>
      </div>

      <div className="workflow-config-form panel">
        <h2 className="wizard-step-title wizard-step-title--solo">New Generation</h2>

        <div className="wizard-field-row field-row">
          <label className="field">
            <span>Template</span>
            <select
              className="wizard-select"
              value={draft.template}
              onChange={(e) => onDraftChange({ ...draft, template: e.target.value })}
            >
              {PROFILE_TEMPLATE_OPTIONS.map((template) => (
                <option key={template} value={template}>
                  {template}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Language</span>
            <select
              className="wizard-select"
              value={draft.language}
              onChange={(e) => onDraftChange({ ...draft, language: e.target.value })}
            >
              {OUTPUT_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="wizard-field-row field-row">
          {profileType === "single" && (
            <label className="field">
              <span>Length</span>
              <select
                className="wizard-select"
                value={draft.length}
                onChange={(e) => onDraftChange({ ...draft, length: e.target.value })}
              >
                {OUTPUT_LENGTHS.map((length) => (
                  <option key={length.id} value={length.label}>
                    {length.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Dictionary</span>
            <select
              className="wizard-select"
              value={draft.dictionary}
              onChange={(e) => onDraftChange({ ...draft, dictionary: e.target.value })}
            >
              {DICTIONARIES.map((dictionary) => (
                <option key={dictionary.id} value={dictionary.label}>
                  {dictionary.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="wizard-fieldset">
          <legend>Style Guides</legend>
          <div className="checkbox-grid checkbox-grid--wizard-full">
            {styleGuideOptions.map((guide) => (
              <label key={guide} className="checkbox-card">
                <input
                  type="checkbox"
                  checked={draft.styleGuides.includes(guide)}
                  onChange={(e) => updateList("styleGuides", guide, e.target.checked)}
                />
                <span>
                  {guide}
                  {guide === personalStyleGuide ? " (yours)" : ""}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="wizard-fieldset">
          <legend>Reference content</legend>
          <div className="checkbox-grid">
            {REFERENCE_DOCUMENTS.map((reference) => (
              <label key={reference.id} className="checkbox-card">
                <input
                  type="checkbox"
                  checked={draft.referenceContent.includes(reference.label)}
                  onChange={(e) => updateList("referenceContent", reference.label, e.target.checked)}
                />
                <span>{reference.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {onSaveProfileChange && (
          <div className="save-profile-block">
            <label className="save-profile-switch">
              <input
                type="checkbox"
                checked={saveProfile}
                onChange={(e) => onSaveProfileChange(e.target.checked)}
              />
              <span>Save Profile</span>
            </label>
            {saveProfile && onProfileNameChange && (
              <label className="field save-profile-name-field">
                <span>Profile name</span>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => onProfileNameChange(e.target.value)}
                  placeholder="e.g. Weekly catalog run"
                />
              </label>
            )}
          </div>
        )}

        {footerMessage && <p className="meta workflow-save-message">{footerMessage}</p>}

        <div className="wizard-step-actions">
          <button type="button" className="btn-primary" onClick={onPrimaryAction}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

export function useProfileDraft(sessionName: string, initialType: ProfileType = "single") {
  const [profileType, setProfileType] = useState<ProfileType>(initialType);
  const [draft, setDraft] = useState(() => newProfileDefaults(sessionName, initialType));
  return { profileType, setProfileType, draft, setDraft };
}
