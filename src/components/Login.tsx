import { DEMO_USER, type User } from "../data/session";

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="home-topbar-logo login-logo">ASICS</div>
          <h1 className="login-title">Copy studio</h1>
          <p className="login-subtitle">Sign in to start generating content</p>
        </div>
        <button type="button" className="login-btn" onClick={() => onLogin(DEMO_USER)}>
          Continue as {DEMO_USER.name}
        </button>
      </div>
    </div>
  );
}
