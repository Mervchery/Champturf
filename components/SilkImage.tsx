// Displays the actual silk artwork scraped from supertote.mu for a
// specific horse (see scraper/lib/parseRacePage.mjs), rather than a
// generated approximation — this already reflects the owner's real
// colors and cap, no matter which stable trains the horse.
//
// Renders nothing (not a placeholder) when a horse has no silk image yet
// (e.g. never scraped, or added manually with none set) — an empty slot
// reads better here than a fake generic silk standing in for a specific
// horse's real one.
export default function SilkImage({ url, size = 34, title, className }: { url?: string | null; size?: number; title?: string; className?: string }) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt={title ? `${title} silk` : "Silk"}
      title={title}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  );
}
