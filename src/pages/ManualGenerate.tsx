import { useEffect, useState } from "react";
import { SavedProfileCards } from "../components/SavedProfileCards";
import { ProfileSettingsForm, useProfileDraft } from "../components/ProfileSettingsForm";
import { IconChevronLeft } from "../components/Icons";
import type { User } from "../data/session";
import { loadProfiles, saveProfiles, type SavedProfile } from "../data/profiles";

interface ManualGenerateProps {
  user: User;
  openWizard: boolean;
  onWizardOpened: () => void;
  landingResetKey: number;
  onRunProfile: (profile: SavedProfile) => void;
}

export function ManualGenerate({
  user,
  openWizard,
  onWizardOpened,
  landingResetKey,
  onRunProfile,
}: ManualGenerateProps) {
  const [showLaunchSetup, setShowLaunchSetup] = useState(false);
  const [profiles, setProfiles] = useState<SavedProfile[]>(() => loadProfiles());
  const { profileType, setProfileType, draft, setDraft } = useProfileDraft(user.name);
  const [saveProfile, setSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  useEffect(() => {
    if (openWizard) {
      setShowLaunchSetup(true);
      onWizardOpened();
    }
  }, [openWizard, onWizardOpened]);

  useEffect(() => {
    setShowLaunchSetup(false);
  }, [landingResetKey]);

  const handleLaunch = () => {
    setLaunchMessage(null);

    if (saveProfile && !profileName.trim()) {
      setLaunchMessage("Enter a profile name to save this configuration.");
      return;
    }

    const runName = saveProfile
      ? profileName.trim()
      : `Generation ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date())}`;

    const profile: SavedProfile = {
      ...draft,
      id: saveProfile ? `profile-${Date.now()}` : `run-${Date.now()}`,
      name: runName,
      type: profileType,
      createdBy: user.name,
      createdAt: new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(
        new Date(),
      ),
    };

    if (saveProfile) {
      const next = [profile, ...profiles];
      setProfiles(next);
      saveProfiles(next);
      setProfileName("");
      setSaveProfile(false);
    }

    setShowLaunchSetup(false);
    onRunProfile(profile);
  };

  if (showLaunchSetup) {
    return (
      <div className="manual-generate-page manual-generate-page--wizard app-page-inner">
        <header className="page-header">
          <button
            type="button"
            className="template-editor-back-btn generate-back-btn"
            onClick={() => setShowLaunchSetup(false)}
          >
            <IconChevronLeft size={18} />
            Back
          </button>
        </header>

        <ProfileSettingsForm
          sessionName={user.name}
          draft={draft}
          profileType={profileType}
          onDraftChange={setDraft}
          onProfileTypeChange={setProfileType}
          saveProfile={saveProfile}
          onSaveProfileChange={setSaveProfile}
          profileName={profileName}
          onProfileNameChange={setProfileName}
          footerMessage={launchMessage}
          onPrimaryAction={handleLaunch}
          primaryLabel="Launch generation"
        />
      </div>
    );
  }

  return (
    <div className="manual-generate-page manual-generate-page--landing">
      <h1 className="manual-generate-title">What do you want to generate?</h1>
      <section className="manual-generate-profiles" aria-label="Saved profiles">
        <SavedProfileCards
          session={user}
          profiles={profiles}
          onProfilesChange={setProfiles}
          onRunProfile={onRunProfile}
        />
      </section>
    </div>
  );
}
