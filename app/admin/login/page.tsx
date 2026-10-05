import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";

// Staff sign in through the same page as everyone else — the account's role,
// not the page, decides whether the dashboard opens.
export default function AdminLoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const params = new URLSearchParams({ next: safeNext(searchParams.next, "/admin") });
  if (searchParams.error) params.set("error", searchParams.error);
  redirect(`/login?${params.toString()}`);
}
