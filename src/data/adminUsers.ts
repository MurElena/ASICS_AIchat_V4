import type { UserRole } from "./roles";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastActive: string;
  status: "active" | "invited";
}

export const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: "u1",
    name: "Alex Dubois",
    email: "alex.dubois@company.com",
    role: "admin",
    lastActive: "Today, 9:42 AM",
    status: "active",
  },
  {
    id: "u2",
    name: "Morgan Lee",
    email: "morgan.lee@company.com",
    role: "project_manager",
    lastActive: "Yesterday, 4:15 PM",
    status: "active",
  },
  {
    id: "u3",
    name: "Samira Patel",
    email: "samira.patel@company.com",
    role: "simple_user",
    lastActive: "May 30, 2026",
    status: "active",
  },
  {
    id: "u4",
    name: "Jordan Kim",
    email: "jordan.kim@company.com",
    role: "simple_user",
    lastActive: "Invitation pending",
    status: "invited",
  },
];
