import { useEffect, useRef, useState } from "react";
import { AdminSystemTab } from "../components/AdminSystemTab";
import { MOCK_ADMIN_USERS, type AdminUser } from "../data/adminUsers";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  STANDARD_RESET_PASSWORD,
  type UserRole,
} from "../data/roles";

type AdminTab = "users" | "system";

export function Admin() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<AdminUser[]>(MOCK_ADMIN_USERS);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const handleResetPassword = (user: AdminUser) => {
    setOpenMenuId(null);
    window.alert(
      `Password for ${user.name} has been reset.\n\nNew temporary password: ${STANDARD_RESET_PASSWORD}`,
    );
  };

  const handleDeleteUser = (user: AdminUser) => {
    setOpenMenuId(null);
    if (!window.confirm(`Delete user ${user.name}?`)) return;
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  };

  const handleEditRole = (user: AdminUser) => {
    setOpenMenuId(null);
    const next = window.prompt(
      `Set role for ${user.name} (admin, project_manager, simple_user):`,
      user.role,
    );
    if (!next) return;
    const role = next.trim() as UserRole;
    if (!["admin", "project_manager", "simple_user"].includes(role)) {
      window.alert("Invalid role.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
  };

  const handleResendInvitation = (user: AdminUser) => {
    setOpenMenuId(null);
    window.alert(`Invitation resent to ${user.email}.`);
  };

  const handleInviteUser = () => {
    window.alert("Invite User workflow (coming soon).");
  };

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Manage users, roles, and system configuration</p>
      </header>

      <div className="knowledge-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "users"}
          className={`template-tab${tab === "users" ? " template-tab--active" : ""}`}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "system"}
          className={`template-tab${tab === "system" ? " template-tab--active" : ""}`}
          onClick={() => setTab("system")}
        >
          System
        </button>
      </div>

      {tab === "users" && (
        <>
          <div className="admin-users-header">
            <h2 className="admin-section-title">Team members</h2>
            <button type="button" className="btn-primary" onClick={handleInviteUser}>
              Invite User
            </button>
          </div>

          <div className="admin-roles-legend panel">
            <h3 className="admin-roles-legend-title">User roles</h3>
            <ul className="admin-roles-list">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                <li key={role}>
                  <strong>{ROLE_LABELS[role]}</strong> — {ROLE_DESCRIPTIONS[role]}
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-users-table panel" ref={menuRef}>
            <div className="admin-users-row admin-users-row--head">
              <span>User</span>
              <span>Role</span>
              <span>Last active</span>
              <span className="admin-users-actions-head">Actions</span>
            </div>
            {users.map((user) => (
              <div key={user.id} className="admin-users-row">
                <div className="admin-user-cell">
                  <span className="admin-user-name">{user.name}</span>
                  <span className="admin-user-email">{user.email}</span>
                  {user.status === "invited" && (
                    <span className="admin-user-badge">Invited</span>
                  )}
                </div>
                <span className="admin-user-role">{ROLE_LABELS[user.role]}</span>
                <span className="admin-user-last">{user.lastActive}</span>
                <div className="admin-user-menu-wrap">
                  <button
                    type="button"
                    className="admin-kebab"
                    aria-label={`Actions for ${user.name}`}
                    aria-expanded={openMenuId === user.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === user.id ? null : user.id);
                    }}
                  >
                    ⋮
                  </button>
                  {openMenuId === user.id && (
                    <ul className="admin-dropdown" role="menu">
                      <li>
                        <button type="button" role="menuitem" onClick={() => handleEditRole(user)}>
                          Edit Role
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleResendInvitation(user)}
                        >
                          Resend invitation
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleResetPassword(user)}
                        >
                          Reset password
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          role="menuitem"
                          className="admin-dropdown-danger"
                          onClick={() => handleDeleteUser(user)}
                        >
                          Delete user
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "system" && <AdminSystemTab />}
    </div>
  );
}
