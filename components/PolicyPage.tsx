import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { SITE } from "@/lib/site";

export type PolicySection = { title: string; body: (string | string[])[] };

const LINKS: [string, string][] = [
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms of Use"],
  ["/cookies", "Cookie Policy"],
  ["/community-guidelines", "Community guidelines"],
];

/** Shared layout for the legal pages. Strings in `sections` are plain English
 *  and run through t() — add French to lib/i18n/fr.ts to translate them. A
 *  body entry that is an array renders as a bullet list. */
export default function PolicyPage({ title, intro, sections, current }: {
  title: string; intro: string; sections: PolicySection[]; current: string;
}) {
  const { t } = getT();
  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("LEGAL")}</span>
          <h1 className="text-3xl font-display mt-1">{t(title)}</h1>
          <p className="text-sm text-white/75 mt-1">{t("Last updated")}: {SITE.updated}</p>
        </div>
      </div>
      <section className="py-8 md:py-12">
        <div className="wrap grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-start">
          <nav aria-label={t("Legal")} className="md:sticky md:top-24 flex md:flex-col gap-1 flex-wrap text-sm">
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-lg ${href === current ? "bg-parchment2 font-semibold" : "opacity-70 hover:bg-parchment2"}`}
              >
                {t(label)}
              </Link>
            ))}
          </nav>
          <article className="card no-hover p-6 md:p-8 max-w-3xl text-[15px] leading-relaxed">
            <p className="opacity-80">{t(intro)}</p>
            {sections.map((s, i) => (
              <div key={s.title} className="mt-7">
                <h2 className="font-display text-xl mb-2">{i + 1}. {t(s.title)}</h2>
                {s.body.map((b, j) =>
                  Array.isArray(b) ? (
                    <ul key={j} className="list-disc pl-5 space-y-1 my-2 opacity-85">
                      {b.map((li) => <li key={li}>{t(li)}</li>)}
                    </ul>
                  ) : (
                    <p key={j} className="my-2 opacity-85">{t(b)}</p>
                  )
                )}
              </div>
            ))}
            <p className="mt-8 text-sm opacity-70">
              {t("Questions? Contact us at")} <a className="underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
