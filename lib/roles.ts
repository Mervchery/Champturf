// Roles are stored per-user in the `profiles` table (see supabase/schema.sql)
// and set via Supabase — not chosen at login time. Any authenticated user
// without a row in `profiles`, or with a role not in this list, is treated
// as not authorized for /admin.
export const ADMIN_ROLES = [
  "Super Admin",
  "Administrator",
  "Race Manager",
  "Editor",
  "Statistician",
  "Stream Operator",
] as const;

export type Role = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: string | null | undefined): role is Role {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
