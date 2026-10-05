/** Only allow redirects to a path on this site. Blocks open-redirect tricks such as
 *  ?next=https://evil.example, ?next=//evil.example or ?next=/\evil.example. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
