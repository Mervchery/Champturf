import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-turf text-white/70 pt-12 pb-7 mt-16">
      <div className="wrap flex flex-wrap gap-8 justify-between">
        <div className="max-w-[260px]">
          <h4 className="text-white text-sm mb-2.5">Champ Turf</h4>
          <p className="text-sm opacity-75 leading-relaxed">
            The independent home of Mauritian horse racing — race data, profiles, and live coverage from Champ de Mars.
          </p>
        </div>
        <div>
          <h4 className="text-white text-sm mb-2.5">Explore</h4>
          <Link href="/races" className="block text-sm py-1 text-white/60">Race calendar</Link>
          <Link href="/horses" className="block text-sm py-1 text-white/60">Horses</Link>
          <Link href="/jockeys" className="block text-sm py-1 text-white/60">Jockeys</Link>
          <Link href="/stats" className="block text-sm py-1 text-white/60">Statistics</Link>
        </div>
        <div>
          <h4 className="text-white text-sm mb-2.5">Coverage</h4>
          <Link href="/live" className="block text-sm py-1 text-white/60">Live streams</Link>
          <Link href="/results" className="block text-sm py-1 text-white/60">Results centre</Link>
          <Link href="/news" className="block text-sm py-1 text-white/60">News</Link>
        </div>
        <div>
          <h4 className="text-white text-sm mb-2.5">Platform</h4>
          <Link href="/admin" className="block text-sm py-1 text-white/60">Admin dashboard</Link>
        </div>
      </div>
      <div className="wrap flex flex-wrap gap-2 justify-between mt-8 pt-4 border-t border-white/10 text-xs">
        <span>© 2026 Champ Turf — a fan-built demo platform, unaffiliated with any official body.</span>
        <span>Multi-language: EN · FR · Kreol Morisien</span>
      </div>
    </footer>
  );
}
