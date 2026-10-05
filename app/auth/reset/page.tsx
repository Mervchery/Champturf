"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/LanguageProvider";

// Landing page for the link in a password-reset email (arrives via /auth/callback
// with a temporary session). The visitor picks a new password here.
export default function ResetPasswordPage() {
  const { t } = useT();
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setReady(!!data.user));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError(t("Use at least 8 characters for your password.")); return; }
    if (password !== confirm) { setError(t("The two passwords don't match.")); return; }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
    setTimeout(() => { router.push("/account"); router.refresh(); }, 1200);
  }

  const inputCls = "w-full px-3 py-2.5 border border-line rounded-md bg-parchment text-sm";
  return (
    <section className="min-h-[70vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px] card no-hover p-8">
        <h1 className="font-display text-2xl">{t("Choose a new password")}</h1>
        {ready === false ? (
          <p className="text-sm mt-3 opacity-75">{t("This reset link has expired. Request a new one from the sign-in page.")}</p>
        ) : done ? (
          <p className="text-sm mt-3">{t("Password updated.")}</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5">
            <label className="text-xs opacity-65 block mb-1.5" htmlFor="rp-pass">{t("New password")}</label>
            <input id="rp-pass" type="password" className={`${inputCls} mb-3.5`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <label className="text-xs opacity-65 block mb-1.5" htmlFor="rp-confirm">{t("Confirm password")}</label>
            <input id="rp-confirm" type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            {error && <div role="alert" className="text-coral text-sm mt-3">{error}</div>}
            <button type="submit" disabled={loading || ready === null} className="btn btn-dark w-full justify-center mt-5 disabled:opacity-60">
              {loading ? t("Please wait…") : t("Update password")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
