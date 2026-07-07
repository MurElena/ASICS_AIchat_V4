export type UserRole = "admin" | "project_manager" | "simple_user";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  project_manager: "Project Manager",
  simple_user: "Copywriter",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Can see and do anything in the platform.",
  project_manager: "Can see and use all areas except Admin.",
  simple_user: "Can see Dashboard, Generate, and own History only.",
};

export const STANDARD_RESET_PASSWORD = "PleaseChangeASAP";
