"use client";

import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/users";
import { setUserRole } from "@/lib/actions/users";
import { ADMIN_ROLES } from "@/lib/roles";

export default function UsersAdminPanel({ profiles, notify }: { profiles: Profile[]; notify: (m: string) => void }) {
  const router = useRouter();

  async function handleChange(userId: string, role: string) {
    try {
      await setUserRole(userId, role as any);
      notify("Role updated");
      router.refresh();
    } catch (e: any) {
      notify(e.message || "Something went wrong.");
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-5">Users &amp; roles</h2>
      <p className="text-sm opacity-60 mb-4">
        Roles are Supabase accounts, not invites — someone needs an account already (Authentication → Users
        in the Supabase dashboard) before they show up here to be granted a role.
      </p>
      <div className="panel !p-0 overflow-hidden">
        <table>
          <thead><tr><th>Email</th><th>Role</th></tr></thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td>{p.email}</td>
                <td>
                  <select
                    className="px-2.5 py-1.5 border border-line rounded-md bg-surface text-sm"
                    value={p.role ?? ""}
                    onChange={(e) => handleChange(p.id, e.target.value)}
                  >
                    <option value="">No admin access</option>
                    {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && <tr><td colSpan={2} className="text-sm opacity-60">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
