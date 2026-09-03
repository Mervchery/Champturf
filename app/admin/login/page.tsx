"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const notAuthorized = params.get("error") === "not_authorized";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push(params.get("next") || "/admin");
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[380px] card p-8">
        <span className="text-xs font-semibold text-coral">RESTRICTED ACCESS</span>
        <h2 className="font-display text-2xl mt-1.5 flex items-center gap-2"><LockKeyhole size={20} /> Admin sign in</h2>
        <p className="text-sm opacity-70 mt-1.5 mb-5">Sign in with your Supabase account. Your role determines what you can do here.</p>

        {notAuthorized && (
          <div className="text-coral text-sm mb-4 bg-parchment2 p-3 rounded-md">
            That account is signed in but doesn&apos;t have an admin role yet. Ask a Super Admin to grant one.
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label className="text-xs opacity-65 block mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2.5 border border-line rounded-md bg-parchment text-sm mb-3.5"
            autoComplete="email"
          />

          <label className="text-xs opacity-65 block mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 border border-line rounded-md bg-parchment text-sm"
            autoComplete="current-password"
          />

          {error && <div className="text-coral text-sm mt-2.5">{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-dark w-full justify-center mt-5 disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="text-xs opacity-55 bg-parchment2 p-3 rounded-md mt-4 leading-relaxed">
          No account yet? Create one in the Supabase dashboard (Authentication → Users), or enable sign-up
          and add it here. New accounts have no admin role by default — see <code>supabase/schema.sql</code>.
        </div>
      </div>
    </div>
  );
}
