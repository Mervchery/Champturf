"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/LanguageProvider";

export default function SignOutButton({ variant = "button" }: { variant?: "button" | "link" }) {
  const { t } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (variant === "link") {
    return <button type="button" onClick={signOut} disabled={busy} className="tap underline font-semibold">{t("Sign out")}</button>;
  }
  return (
    <button type="button" onClick={signOut} disabled={busy} className="btn btn-outline disabled:opacity-60">
      <LogOut size={15} /> {t("Sign out")}
    </button>
  );
}
