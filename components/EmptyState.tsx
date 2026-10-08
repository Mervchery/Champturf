import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: { href: string; label: string };
  className?: string;
};

/** One consistent look for "nothing here (yet)" across the site. */
export default function EmptyState({ icon, title, hint, action, className = "" }: Props) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {hint && <p className="text-sm opacity-70 mt-1 max-w-[44ch] mx-auto">{hint}</p>}
      {action && <Link href={action.href} className="btn btn-outline mt-4">{action.label}</Link>}
    </div>
  );
}
