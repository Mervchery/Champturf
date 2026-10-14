import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Banknote, BookOpen, CloudSun, Coins, Ear, Eye, Flag, Gauge, Glasses,
  Hash, LayoutGrid, Medal, Percent, Receipt, Route, Ruler, Scale, Sparkles, Star, Target, Timer, TrendingUp, Trophy, Weight,
} from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({
    title: t("Racing guide"),
    description: t("What gear, weight, gate, rating, odds, stakes and the other numbers on a Champ Turf race card mean — in plain language."),
    path: "/guide",
  });
}

type Icon = typeof Hash;
type Term = { id: string; icon: Icon; term: string; short: string; more?: string };
type Section = { id: string; title: string; chip: string; intro?: string; terms: Term[] };

// All English; every string goes through t() when rendered, French lives in lib/i18n/fr.ts.
const SECTIONS: Section[] = [
  {
    id: "runner-card",
    title: "Reading a runner card",
    chip: "Runner card",
    intro: "Each runner on a race card is a row of small numbers. Here is what every one of them is telling you.",
    terms: [
      { id: "horse-no", icon: Hash, term: "Horse No.", short: "The runner’s number on the racecard.", more: "It identifies the horse on tote tickets and on the track. It is not where the horse starts from — that is the gate." },
      { id: "gate", icon: LayoutGrid, term: "Gate", short: "The starting stall the horse is drawn in.", more: "Gate 1 is the closest to the inside rail. A low gate can save ground into the first bend, but how much it matters depends on the distance and on how the track is riding." },
      { id: "weight", icon: Weight, term: "Weight", short: "The kilograms the horse carries in the race.", more: "That is the jockey plus the saddle and any lead weights added to reach the weight set for the horse. In handicap races the better-rated horses are given more weight, to even up the field." },
      { id: "rating", icon: Gauge, term: "Rating", short: "A number for the horse’s ability.", more: "Set by the racing club’s handicapper, where available. Higher means better, and it is used to decide how much weight a horse carries in a handicap." },
      { id: "hwt", icon: Scale, term: "HWT (horse weight)", short: "The horse’s own body weight on race day.", more: "The small + or − underneath is the change since its previous run: 507 with −1 means one kilo lighter than last time. A few kilos either way is normal." },
      { id: "form", icon: TrendingUp, term: "Recent form", short: "Finishing positions of recent runs, newest first.", more: "A gold 1 is a win, an outlined 2 or 3 is a place, and anything else is grey. “Last run 21d ago” is how long the horse has been off." },
      { id: "record", icon: Activity, term: "Career record", short: "Wins and places from starts, plus earnings.", more: "“3W-5P from 12” is three wins and five places (2nd or 3rd) from twelve starts. In the ring, solid gold is the share of wins, faded gold the share of places, and the number in the middle is total starts." },
      { id: "scratched", icon: Flag, term: "Scratched", short: "A horse withdrawn from the race.", more: "Scratched horses stay on the card, struck through, so you can see who was declared. They have no odds and don’t count as runners." },
    ],
  },
  {
    id: "gear",
    title: "Gear",
    chip: "Gear",
    intro: "Gear is the extra equipment a horse wears to help it concentrate or run more comfortably. On a runner card you will see a chip with the club’s code for it; a dash means no gear.",
    terms: [
      { id: "gear-changed", icon: Sparkles, term: "Orange chip with *", short: "The gear has changed since the horse’s last run.", more: "On a computer, hover the chip to see what it was before. Trainers often change gear to try to improve a horse, so it is worth a look — though it is never a guarantee." },
      { id: "blinkers", icon: Eye, term: "Blinkers", short: "Cups either side of the eyes that limit sight to the sides and rear.", more: "Used to help a horse keep its mind on the race and not look around." },
      { id: "visor", icon: Glasses, term: "Visor", short: "Like blinkers, with a slit in each cup.", more: "The horse still sees a little to the side, so it is a milder version of blinkers." },
      { id: "cheekpieces", icon: Eye, term: "Cheekpieces", short: "Sheepskin pieces fixed to the bridle beside the eyes.", more: "They limit the view to the side and encourage the horse to look straight ahead." },
      { id: "hood", icon: Ear, term: "Hood", short: "A fabric cover over the ears.", more: "It muffles noise, keeping an excitable horse calmer before and during the race." },
      { id: "tongue-tie", icon: Target, term: "Tongue tie", short: "A strap that holds the tongue down.", more: "It stops the tongue slipping over the bit, which can interfere with breathing." },
      { id: "noseband", icon: Eye, term: "Sheepskin noseband", short: "A fluffy band across the nose.", more: "It blocks the view of the ground just ahead, so a horse that spooks at shadows keeps its head up." },
    ],
  },
  {
    id: "odds",
    title: "Odds & the market",
    chip: "Odds",
    intro: "Prices come from the tote and move as money comes in. They are shown as decimals by default, and you can switch to fractions in the menu.",
    terms: [
      { id: "win", icon: Coins, term: "Win", short: "The tote price for the horse to win.", more: "A price of 4.5 returns 4.5 times your stake if the horse wins, stake included (7/2 in fractions). The lower the price, the more the horse is fancied." },
      { id: "place", icon: Medal, term: "Place", short: "The tote price for the horse to finish in the places.", more: "Shorter than the win price, because finishing in the places is easier than winning." },
      { id: "drift-firm", icon: ArrowDown, term: "Drifting ▲ / Firming ▼", short: "Whether the price has got longer or shorter.", more: "▲ red means the price has lengthened (the horse is less fancied than before). ▼ green means it has shortened (more money coming in). The number is the size of the move, and a pulse means it moved in the last 15 minutes." },
      { id: "opened", icon: Timer, term: "Opened", short: "The first price we recorded for the horse.", more: "Comparing it with the current price shows the overall move since the market opened." },
      { id: "tip", icon: Star, term: "Tip ★", short: "The race’s tipped horse.", more: "Taken from the published racing notes. It is an opinion, not a promise." },
      { id: "danger", icon: AlertTriangle, term: "Danger", short: "The horse the notes flag as the main threat.", more: "Usually the one most likely to beat the tip." },
      { id: "market", icon: Percent, term: "Share of the market", short: "How much of the betting each horse holds.", more: "Each price is turned into a chance and scaled so the whole field adds up to 100%. “One clear favourite”, “A two-horse market” and “Wide open” describe how that share is spread." },
      { id: "predictions", icon: Sparkles, term: "Predictions", short: "A model’s estimate of each horse’s chance.", more: "Built from past results. “Value watch” marks a horse the model rates better than its price. Nothing is shown when there isn’t enough data to predict reliably." },
    ],
  },
  {
    id: "race",
    title: "About the race",
    chip: "Race details",
    terms: [
      { id: "distance", icon: Ruler, term: "Distance", short: "How far the race is run, as published.", more: "Sprints are the shortest races, middle-distance races are in between, and stayers’ races are the longest." },
      { id: "class", icon: Trophy, term: "Class", short: "The club’s grade for the race.", more: "It groups horses of similar ability so they race against each other." },
      { id: "rails", icon: Route, term: "Rails", short: "Where the inside running rail is set for the meeting.", more: "The rail can be moved out from its true position to spread wear on the turf, which makes the track a little longer." },
      { id: "going", icon: CloudSun, term: "Track condition", short: "How firm or soft the ground is.", more: "Some horses run better on firm ground, others on softer ground." },
      { id: "prize", icon: Banknote, term: "Prize money", short: "The total purse for the race.", more: "The split between first, second, third and so on is shown beneath it when the club has published it." },
    ],
  },
  {
    id: "results",
    title: "Reading a result",
    chip: "Results",
    terms: [
      { id: "margin", icon: Ruler, term: "Margin", short: "How far a horse was beaten.", more: "In lengths, as published — a length is roughly the body of a horse. Short head, head and neck are the closest finishes." },
      { id: "time", icon: Timer, term: "Winning time", short: "How long the winner took.", more: "Times are only comparable between races of the same distance on similar ground." },
      { id: "dividend", icon: Receipt, term: "Final Win & Place prices", short: "What the tote paid on a finished race.", more: "On finished races the Win and Place pills show the final tote prices, in the same style as the odds before the race." },
      { id: "odds-format", icon: Percent, term: "Decimal or fractional", short: "Two ways of writing the same price.", more: "Decimal 4.5 and fractional 7/2 mean exactly the same thing. Decimal includes your stake in the return; fractional shows the profit only. Pick your style under Menu → Odds. Rs / £ only changes money, such as prize money and earnings." },
      { id: "perf", icon: Gauge, term: "Perf", short: "A performance score for that run.", more: "Shown on a result when there is no official rating for the horse." },
    ],
  },
  {
    id: "stakes",
    title: "Stakes & statistics",
    chip: "Stakes & stats",
    terms: [
      { id: "stakes", icon: Coins, term: "Stakes", short: "Prize money won.", more: "A horse’s or stable’s stakes are the total prize money it has won. We use each race’s published prize split; where there isn’t one we estimate 60% / 20% / 10% of the purse to the first three." },
      { id: "starts", icon: Activity, term: "Starts, Rides & Runners", short: "How many times a horse, jockey or trainer has run.", more: "Horses have starts, jockeys have rides, and trainers have runners." },
      { id: "placed", icon: Medal, term: "Placed", short: "Finishing second or third.", more: "Wins are counted separately, so a horse’s placed total does not include its wins." },
      { id: "win-pct", icon: Percent, term: "Win %", short: "Wins divided by rides.", more: "A quick way to compare jockeys who have had a different number of rides." },
    ],
  },
  {
    id: "championships",
    title: "Championships",
    chip: "Championships",
    terms: [
      { id: "points", icon: Trophy, term: "Championship points", short: "1st 7 · 2nd 3 · 3rd 2 · 4th 1.", more: "Points add up across the designated races. Sprinters, Milers, Stayers, the Three-Year-Old and the Four-Year-Old Triple Crown tables all use this scale." },
      { id: "overall", icon: Medal, term: "Overall Horse & Stable", short: "Ranked by total stakes won.", more: "Overall Jockey is ranked by wins, with ties broken by second places, then third and so on." },
      { id: "triple-crown", icon: Star, term: "Triple Crown bonus", short: "Winning all three legs.", more: "The bonus only goes to a four-year-old that wins every leg of the Triple Crown." },
    ],
  },
];

/** A static example of a runner card's number strip, built from the real card styles. */
function SampleCard({ t }: { t: (k: string, v?: Record<string, string | number>) => string }) {
  const cells: [string, React.ReactNode, string][] = [
    ["Gate", "4", "#gate"],
    ["Weight", "57.5kg", "#weight"],
    ["Rating", "62", "#rating"],
    ["HWT", <span key="h" className="inline-flex flex-col items-center leading-tight"><span>507</span><span className="text-[0.6rem] font-semibold text-red-700 dark:text-red-400">−1</span></span>, "#hwt"],
    ["Gear", <span key="g" className="gear-chip is-changed">B*</span>, "#gear"],
  ];
  return (
    <div className="guide-sample" aria-label={t("Example runner card")}>
      <div className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-wider opacity-60 mb-2.5">
        <span>{t("Example")}</span><span aria-hidden="true">·</span><span>{t("tap a box to jump to it")}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="runner-number">4</div>
        <div className="min-w-0">
          <div className="font-semibold leading-tight">Sample Horse</div>
          <div className="text-xs opacity-70 mt-0.5">{t("{n}yo", { n: 5 })}{" "}{t("Gelding")}</div>
        </div>
      </div>
      <div className="stats-grid">
        {cells.map(([label, value, href]) => (
          <a key={label} href={href} className="stat-cell guide-cell">
            <div className="stat-label">{t(label)}</div>
            <div className="stat-value">{value}</div>
          </a>
        ))}
      </div>
      <div className="odds-row">
        <div className="odds-pill odds-win"><span className="odds-label">{t("Win")}</span><span className="odds-right"><span className="odds-move is-down"><ArrowDown size={11} strokeWidth={3} />0.5</span><span className="odds-value">3.5</span></span></div>
        <div className="odds-pill odds-place"><span className="odds-label">{t("Place")}</span><span className="odds-right"><span className="odds-value">1.6</span></span></div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[0.62rem] opacity-65 mr-1">{t("Last run {n}d ago", { n: 21 })}</span>
        <span className="form-pill is-win">1</span><span className="form-pill is-place">3</span><span className="form-pill">6</span><span className="form-pill is-place">2</span>
      </div>
    </div>
  );
}

export default function GuidePage() {
  const { t } = getT();
  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2 inline-flex items-center gap-1.5"><BookOpen size={13} /> {t("GUIDE")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Racing guide")}</h1>
          <p className="text-sm text-white/75 mt-1.5 max-w-xl">
            {t("New to racing? This is what the gear, weight, gate, rating, odds and stakes on a race card mean, in plain language.")}
          </p>
        </div>
      </div>

      <nav className="guide-chips" aria-label={t("Sections")}>
        <div className="wrap guide-chips-row">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="guide-chip">{t(s.chip)}</a>
          ))}
        </div>
      </nav>

      <section className="py-7 md:py-10">
        <div className="wrap max-w-3xl">
          <SampleCard t={t} />

          {SECTIONS.map((s) => (
            <div key={s.id} id={s.id} className="guide-section">
              <h2 className="font-display text-2xl">{t(s.title)}</h2>
              {s.intro && <p className="text-sm opacity-75 mt-1.5 leading-relaxed">{t(s.intro)}</p>}
              <ul className="guide-list">
                {s.terms.map(({ id, icon: Icon, term, short, more }) => (
                  <li key={id} id={id} className="guide-row">
                    <span className="guide-glyph" aria-hidden="true"><Icon size={18} strokeWidth={2} /></span>
                    <div className="min-w-0">
                      <h3 className="guide-term">{t(term)}</h3>
                      <p className="guide-short">{t(short)}</p>
                      {more && <p className="guide-more">{t(more)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              {s.id === "gear" && (
                <p className="guide-note">{t("The letters printed on racecards are the club’s own codes and can differ between sources, so use this list for what each piece of gear does rather than matching letters.")}</p>
              )}
            </div>
          ))}

          <p className="guide-note mt-10">
            {t("Champ Turf is for information only and does not accept bets. Please gamble responsibly, and only if you are of legal age.")}{" "}
            <Link href="/terms" className="underline">{t("Terms of Use")}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
