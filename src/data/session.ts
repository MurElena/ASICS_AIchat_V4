import type { UserRole } from "./roles";

export type AppView =
  | "home"
  | "history"
  | "account"
  | "admin"
  | "documentation"
  | "statistics";

export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  avatarDataUrl?: string;
}

export const DEMO_USER: User = {
  userId: "alex",
  name: "Alex Dubois",
  email: "alex.dubois@company.com",
  role: "admin",
  initials: "AD",
};

const SESSION_KEY = "asics_session";

export function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: User | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}
