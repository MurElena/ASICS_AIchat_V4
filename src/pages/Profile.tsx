import { useRef, useState } from "react";
import type { User } from "../data/session";
import { ROLE_LABELS } from "../data/roles";

interface ProfileProps {
  session: User;
  onBack: () => void;
  onUpdateSession: (session: User) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export function Profile({
  session,
  onBack,
  onUpdateSession,
  onLogout,
  onDeleteAccount,
}: ProfileProps) {
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [avatarDataUrl, setAvatarDataUrl] = useState(session.avatarDataUrl);
  const [saved, setSaved] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const initials =
    name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || session.initials;

  const handlePhoto = (file: File) => {
    if (!file.type.startsWith("image/")) {
      window.alert("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarDataUrl(String(reader.result));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim() || !email.trim()) return;
    onUpdateSession({
      ...session,
      name: name.trim(),
      email: email.trim(),
      initials,
      avatarDataUrl,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        "Delete your account permanently? This cannot be undone in this demo.",
      )
    ) {
      return;
    }
    onDeleteAccount();
  };

  return (
    <div className="profile-page">
      <header className="page-header page-header--with-actions">
        <div>
          <button type="button" className="btn-link profile-back" onClick={onBack}>
            ← Back
          </button>
          <h1 className="page-title">Account</h1>
          <p className="page-subtitle">Manage your profile and security</p>
        </div>
      </header>

      <div className="profile-grid">
        <section className="profile-card panel">
          <h2 className="profile-card-title">Profile photo</h2>
          <div className="profile-photo-block">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="" className="profile-photo-img" />
            ) : (
              <div className="profile-photo-placeholder">{initials}</div>
            )}
            <div>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="upload-input-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhoto(file);
                }}
              />
              <button type="button" className="btn-secondary" onClick={() => photoRef.current?.click()}>
                Upload photo
              </button>
              {avatarDataUrl && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setAvatarDataUrl(undefined);
                    setSaved(false);
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="profile-card panel">
          <h2 className="profile-card-title">Personal information</h2>
          <p className="field-hint profile-role-hint">Role: {ROLE_LABELS[session.role]}</p>

          <label className="field">
            <span>Full name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <button type="button" className="btn-primary" onClick={handleSave}>
            {saved ? "Saved" : "Save changes"}
          </button>
        </section>

        <section className="profile-card panel profile-card--danger">
          <h2 className="profile-card-title">Session</h2>
          <p className="wizard-step-desc">Sign out or remove your account from this workspace.</p>
          <div className="profile-actions-stack">
            <button type="button" className="btn-secondary" onClick={onLogout}>
              Log out
            </button>
            <button type="button" className="btn-ghost btn-danger-text" onClick={handleDelete}>
              Delete account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
