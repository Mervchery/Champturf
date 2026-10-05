"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole } from "@/lib/roles";
import { safeNext } from "@/lib/auth";
import { useT } from "@/components/LanguageProvider";

type Mode = "signin" | "signup" | "forgot";

// Which social buttons to show. Each one must also be switched on in Supabase →
// Authentication → Providers. Example: NEXT_PUBLIC_AUTH_PROVIDERS=google,facebook
const PROVIDERS = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "google")
  .split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
const PROVIDER_LABEL: Record<string, string> = { google: "Google", facebook: "Facebook", apple: "Apple", github: "GitHub" };

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-line rounded-md bg-parchment text-sm";

export default function AuthPanel({ next, notice, initialMode = "signin" }: { next: string | null; notice?: string | null; initialMode?: Mode }) {
  const { t } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const callback = (target: string | null) =>
    `${window.location.origin}/auth/callback${target ? `?next=${encodeURIComponent(safeNext(target))}` : ""}`;

  function switchMode(m: Mode) {
    setMode(m); setError(""); setInfo(""); setPassword(""); setConfirm("");
  }

  async function goAfterSignIn(userId: string) {
    let dest = next ? safeNext(next) : null;
    if (!dest) {
      const { data } = await createClient().from("profiles").select("role").eq("id", userId).single();
      dest = isAdminRole(data?.role) ? "/admin" : "/";
    }
    router.push(dest);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInfo("");
    const supabase = createClient();
    const cleanEmail = email.trim();

    if (!cleanEmail) { setError(t("Enter your email address.")); return; }

    if (mode === "forgot") {
      setLoading(true);
      await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: callback("/auth/reset") });
      setLoading(false);
      // Same message whether or not the address has an account.
      setInfo(t("If that address has an account, a reset link is on its way."));
      return;
    }

    if (!password) { setError(t("Enter your password.")); return; }

    if (mode === "signup") {
      if (!agreed) { setError(t("Please accept the Terms and Privacy Policy to create an account.")); return; }
      if (password.length < 8) { setError(t("Use at least 8 characters for your password.")); return; }
      if (password !== confirm) { setError(t("The two passwords don't match.")); return; }
      setLoading(true);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: callback(next), data: name.trim() ? { full_name: name.trim() } : undefined },
      });
      setLoading(false);
      if (signUpError) { setError(signUpError.message); return; }
      // Supabase answers with an empty identities list when the email is already registered.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setError(t("That email already has an account — sign in instead."));
        return;
      }
      if (data.session && data.user) { await goAfterSignIn(data.user.id); return; }
      setInfo(t("Check your inbox to confirm your email, then sign in."));
      return;
    }

    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (signInError || !data.user) {
      setLoading(false);
      setError(signInError?.message ?? t("Couldn't sign you in."));
      return;
    }
    await goAfterSignIn(data.user.id);
    setLoading(false);
  }

  async function social(provider: string) {
    setError("");
    if (mode === "signup" && !agreed) { setError(t("Please accept the Terms and Privacy Policy to create an account.")); return; }
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: provider as any,
      options: { redirectTo: callback(next) },
    });
    if (oauthError) setError(oauthError.message);
  }

  const title = mode === "signup" ? t("Create your account") : mode === "forgot" ? t("Reset your password") : t("Welcome back");
  const submitLabel = mode === "signup" ? t("Create account") : mode === "forgot" ? t("Send reset link") : t("Sign in");

  return (
    <div className="w-full max-w-[400px] card no-hover p-8">
      <span className="text-xs font-semibold text-coral">{t("YOUR ACCOUNT")}</span>
      <h1 className="font-display text-2xl mt-1.5">{title}</h1>
      <p className="text-sm opacity-70 mt-1.5 mb-5">
        {mode === "signup"
          ? t("Join Champ Turf with your email or Google account.")
          : mode === "forgot"
            ? t("Enter your email and we'll send you a link to choose a new password.")
            : t("Sign in to your Champ Turf account.")}
      </p>

      {notice && <div className="text-coral text-sm mb-4 bg-parchment2 p-3 rounded-md">{notice}</div>}

      {mode !== "forgot" && PROVIDERS.length > 0 && (
        <>
          <div className="grid gap-2.5">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => social(p)}
                className="btn btn-outline w-full justify-center gap-2.5"
              >
                {p === "google" && <GoogleG />}
                {t("Continue with {provider}", { provider: PROVIDER_LABEL[p] ?? p })}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 my-5 text-xs opacity-50">
            <span className="flex-1 h-px bg-line" /> {t("or")} <span className="flex-1 h-px bg-line" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} noValidate>
        {mode === "signup" && (
          <>
            <label className="text-xs opacity-65 block mb-1.5" htmlFor="auth-name">{t("Name (optional)")}</label>
            <input id="auth-name" className={`${inputCls} mb-3.5`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </>
        )}

        <label className="text-xs opacity-65 block mb-1.5" htmlFor="auth-email">{t("Email")}</label>
        <input
          id="auth-email" type="email" className={`${inputCls} mb-3.5`} value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
        />

        {mode !== "forgot" && (
          <>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-xs opacity-65" htmlFor="auth-password">{t("Password")}</label>
              {mode === "signin" && (
                <button type="button" className="text-xs underline opacity-70" onClick={() => switchMode("forgot")}>
                  {t("Forgot password?")}
                </button>
              )}
            </div>
            <input
              id="auth-password" type="password" className={inputCls} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </>
        )}

        {mode === "signup" && (
          <>
            <label className="text-xs opacity-65 block mb-1.5 mt-3.5" htmlFor="auth-confirm">{t("Confirm password")}</label>
            <input
              id="auth-confirm" type="password" className={inputCls} value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password"
            />
          </>
        )}

        {error && <div role="alert" className="text-coral text-sm mt-3">{error}</div>}
        {info && <div role="status" className="text-sm mt-3 bg-parchment2 p-3 rounded-md">{info}</div>}

        <button type="submit" disabled={loading} className="btn btn-dark w-full justify-center mt-5 disabled:opacity-60">
          {loading ? t("Please wait…") : submitLabel}
        </button>
      </form>

      {mode === "signup" && (
        <label className="flex items-start gap-2 text-xs opacity-75 mt-3 leading-relaxed cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
          <span>
            {t("I am 18 or over and I accept the")}{" "}
            <Link href="/terms" target="_blank" className="underline">{t("Terms of Use")}</Link>{" "}{t("and")}{" "}
            <Link href="/privacy" target="_blank" className="underline">{t("Privacy Policy")}</Link>.
          </span>
        </label>
      )}

      {mode === "signin" && (
        <p className="text-xs opacity-55 mt-4 text-center leading-relaxed">
          {t("By continuing you accept our")} <Link href="/terms" className="underline">{t("Terms of Use")}</Link> {t("and")} <Link href="/privacy" className="underline">{t("Privacy Policy")}</Link>.
        </p>
      )}

      <p className="text-sm text-center mt-5 opacity-80">
        {mode === "signin" ? (
          <>{t("New here?")} <button type="button" className="font-semibold underline" onClick={() => switchMode("signup")}>{t("Create an account")}</button></>
        ) : (
          <>{t("Already have an account?")} <button type="button" className="font-semibold underline" onClick={() => switchMode("signin")}>{t("Sign in")}</button></>
        )}
      </p>
    </div>
  );
}
