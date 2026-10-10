"""Score upcoming races with the trained model and store the predictions for the site.

    python ml/predict.py             # writes race_predictions
    python ml/predict.py --dry-run   # prints only

Needs ml/models/ from train.py. If the last run was 'insufficient_data' nothing is written — the site
shows how much history is missing instead of made-up picks.
"""
import json, os, sys
import numpy as np
import pandas as pd
import xgboost as xgb
import calibrate
from config import *
from data import Supabase, load_tables
from dataset import build

LABELS = {  # feature -> (label when it helps, optional value test)
    "h_win5": lambda v: f"Won {int(v)} of last 5" if v >= 1 else None,
    "h_top3_5": lambda v: f"Top 3 in {int(v)} of last 5" if v >= 2 else None,
    "h_avg3_pos": lambda v: "Finishing near the front lately",
    "h_avg5_pos": lambda v: "Strong finishing record over last 5",
    "h_last_pos": lambda v: "Ran well last time",
    "h_best5_pos": lambda v: "Has finished at the front recently",
    "h_improve": lambda v: "Form improving" if v > 0 else None,
    "h_consistency": lambda v: "Consistent finisher",
    "h_dist_top3": lambda v: "Good record around this distance",
    "h_class_change": lambda v: "Dropping in class" if v < 0 else None,
    "h_best_pos_class": lambda v: "Competitive at this class",
    "h_weight_change": lambda v: "Carrying less than last run" if v < 0 else None,
    "weight_rel": lambda v: "Light weight for this field" if v < 0 else None,
    "weight_rank": lambda v: None,
    "h_win_rate": lambda v: "Strong career win rate",
    "h_top3_rate": lambda v: "Reliable placer",
    "h_last_margin": lambda v: "Beaten by a short margin last time" if v <= 2 else None,
    "h_avg3_margin": lambda v: "Close to the winner in recent runs" if v <= 3 else None,
    "j_win_rate": lambda v: "Jockey has a strong record",
    "j_top3_rate": lambda v: "Jockey places often",
    "t_win_rate": lambda v: "Trainer has a strong record",
    "t_top3_rate": lambda v: "Trainer places often",
    "jh_runs": lambda v: "Jockey knows the horse" if v >= 2 else None,
    "gate": lambda v: "Helpful gate", "gate_rel": lambda v: "Helpful gate",
    "h_days_since": lambda v: f"Fresh from a {int(v)}-day break" if 14 <= v <= 60 else None,
    "move_pct": lambda v: "Firming in the market" if v < -0.05 else None,
    "open_prob_ratio": lambda v: "Price has shortened since opening" if v < 0.95 else None,
    "mkt_prob": lambda v: "Strong market support", "log_odds": lambda v: "Strong market support",
    "odds_dec": lambda v: "Strong market support", "mkt_rank": lambda v: "Near the top of the market" if v <= 2 else None,
    "is_tipped": lambda v: "Tipped on Supertote" if v >= 1 else None,
    "avg5_rel": lambda v: "Better recent form than rivals", "win_rate_rel": lambda v: "Better win record than rivals",
    "rating_rel": lambda v: "Rated above the field" if v > 0 else None,
}
CONCERN = {"h_runs": "Few previous runs", "h_days_since": "Long layoff", "h_class_change": "Up in class",
           "move_pct": "Drifting in the market", "h_win_rate": "Modest win record", "weight_rel": "Heavy weight for this field"}


def load_models():
    meta = json.load(open(os.path.join(MODEL_DIR, "meta.json")))
    boosters = {}
    for name in meta["models"]:
        b = xgb.Booster(); b.load_model(os.path.join(MODEL_DIR, f"model_{name}.json")); boosters[name] = b
    return meta, boosters


def score(df, meta, boosters, name):
    info = meta["models"][name]; feats = info["features"]; b = boosters[name]
    d = xgb.DMatrix(df[feats], missing=np.nan)
    rng = (0, info["best_iteration"] + 1)
    raw = b.predict(d, iteration_range=rng)
    contrib = b.predict(d, pred_contribs=True, iteration_range=rng)[:, :-1]
    return calibrate.apply(info["calibration"], raw), contrib, feats


def factors(contrib_row, feats, row):
    pos = []
    for i in np.argsort(-contrib_row):
        f, c = feats[i], contrib_row[i]
        if c < 0.04 or f not in LABELS or pd.isna(row[f]):
            continue
        label = LABELS[f](row[f])
        if label and all(label != p["label"] for p in pos):
            pos.append({"label": label, "impact": round(float(c), 3)})
        if len(pos) == 3:
            break
    neg = []
    for i in np.argsort(contrib_row):
        f, c = feats[i], contrib_row[i]
        if c > -0.08:
            break
        if f in CONCERN and not pd.isna(row[f]):
            neg.append({"label": CONCERN[f], "impact": round(float(c), 3)}); break
    return pos + neg


def confidence(runs, uses_market, p_a, p_b):
    level = 0 if runs < 3 else 1 if runs < 5 else 2          # data depth
    if not uses_market:
        level -= 1
    if p_a is not None and p_b is not None and abs(p_a - p_b) > 0.4 * max(p_a, p_b):
        level -= 1                                            # the two models disagree
    return ["low", "medium", "high"][max(0, min(2, level))]


def main(dry_run=False):
    db = Supabase()
    meta_path = os.path.join(MODEL_DIR, "meta.json")
    runs = db.fetch("model_runs", "version,status,trained_at")
    if runs.empty or runs.sort_values("trained_at").iloc[-1]["status"] != "ready" or not os.path.exists(meta_path):
        print("No ready model (insufficient data or not trained yet) — no predictions written.")
        return
    meta, boosters = load_models()
    races, results, entries = load_tables(db)
    hist, upcoming, fb, info = build(races, results, entries, odds_unit=meta.get("odds_unit"))
    if upcoming.empty:
        print("No upcoming races with declared runners."); return
    unit = meta.get("odds_unit") or 1.0
    records = []
    for rid, g in upcoming.groupby("race_id"):
        g = g.reset_index(drop=True)
        pa, ca, fa = score(g, meta, boosters, "A")
        use_b = "B" in boosters and g["mkt_prob"].notna().all()
        if use_b:
            pb, cb, fb_ = score(g, meta, boosters, "B")
            p, c, feats = pb, cb, fb_
        else:
            p, c, feats = pa, ca, fa
        p = p / p.sum()
        pa_n = pa / pa.sum()
        order = (-p).argsort().argsort() + 1
        for i, row in g.iterrows():
            dec = row["odds_dec"]
            edge = float(p[i] * dec - 1) if use_b and pd.notna(dec) else None
            conf = confidence(int(row["h_runs"]), use_b, float(pa_n[i]) if use_b else None, float(p[i]) if use_b else None)
            records.append(dict(
                race_id=rid, horse_id=row["horse_id"], model_version=meta["version"], win_prob=round(float(p[i]), 4),
                rank=int(order[i]), confidence=conf, uses_market=bool(use_b),
                fair_odds=round(float(unit / p[i]), 2), value_edge=round(edge, 3) if edge is not None else None,
                is_value=bool(edge is not None and edge >= VALUE_MIN_EDGE and p[i] >= VALUE_MIN_PROB and conf != "low"),
                factors=factors(c[i], feats, row)))
    print(f"Scored {len(set(r['race_id'] for r in records))} races, {len(records)} runners; "
          f"{sum(r['is_value'] for r in records)} value flags.")
    if dry_run:
        for r in records[:12]: print(r)
        return
    db.delete_where("race_predictions", "race_id", sorted({r["race_id"] for r in records}))
    db.upsert("race_predictions", records, "race_id,horse_id")
    print("Predictions saved.")


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
