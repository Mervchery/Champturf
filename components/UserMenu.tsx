"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole } from "@/lib/roles";
import { useT } from "@/components/LanguageProvider";

type Me = { id: string; email: string | null; name: string | null; avatar: string | null; staff: boolean };

/** Header account control: "Sign in" when signed out, an avatar menu when signed in.
 *  The dashboard link only appears for staff roles. */
export default function UserMenu() {
  const { t } = useT();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { setMe(null); setLoaded(true); return; }
      const { data: profile } = await supabase.from("profiles").select("role, full_name, avatar_url").eq("id", user.id).single();
      if (cancelled) return;
      setMe({
        id: user.id,
        email: user.email ?? null,
        name: profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatar: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
        staff: isAdminRole(profile?.role),
      });
      setLoaded(true);
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const circle = "flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/15";

  if (!loaded) return <span className={`${circle} opacity-50`} aria-hidden="true" />;

  if (!me) {
    return (
      <Link href="/login" className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-gold2 text-ink text-sm font-semibold" aria-label={t("Sign in")}>
        <UserIcon size={16} /> <span className="hidden sm:inline">{t("Sign in")}</span>
      </Link>
    );
  }

  const initial = (me.name || me.email || "?").trim().charAt(0).toUpperCase();
  async function signOut() {
    setOpen(false);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={box}>
      <button className={`${circle} overflow-hidden font-semibold text-sm`} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={t("My account")}>
        {me.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.avatar} alt="" width={36} height={36} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 rounded-xl bg-surface text-ink shadow-lg border border-line z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <div className="text-sm font-semibold truncate">{me.name ?? me.email}</div>
            {me.name && <div className="text-xs opacity-60 truncate">{me.email}</div>}
          </div>
          <Link href="/account" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-black/5">
            <UserIcon size={15} /> {t("My account")}
          </Link>
          {me.staff && (
            <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-black/5">
              <LayoutDashboard size={15} /> {t("Admin dashboard")}
            </Link>
          )}
          <button role="menuitem" onClick={signOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-black/5 text-left border-t border-line">
            <LogOut size={15} /> {t("Sign out")}
          </button>
        </div>
      )}
    </div>
  );
}
