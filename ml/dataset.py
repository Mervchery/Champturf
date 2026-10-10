"""Turns the raw tables into one training frame (finished races) and one scoring frame (upcoming races)."""
import numpy as np
import pandas as pd
from config import MIN_FIELD
from data import parse_margin_len, raw_price, detect_odds_unit
from features import FeatureBuilder


def build(races, results, entries, odds_unit=None):
    """Returns (hist, upcoming, builder, info). hist has labels; upcoming has features only.
    Entries are used only for prices (last pre-race price + opening price) and for upcoming runners."""
    info = {}
    res = results.dropna(subset=["position"]).copy()
    res["position"] = res["position"].astype(int)
    ent = entries.copy()
    for col in ("odds", "odds_open", "odds_prev"):
        ent[col + "_raw"] = ent[col].map(raw_price) if col in ent else np.nan
    res["close_raw"] = res["win_odds"].map(raw_price)

    # --- decimal odds unit (detected, not assumed) ---
    if odds_unit is None:
        per_race = [g["close_raw"].to_numpy() for _, g in res.groupby("race_id")]
        odds_unit, diag = detect_odds_unit(per_race)
        info["odds_unit_check"] = diag
    info["odds_unit"] = odds_unit

    keyed = ent.set_index(["race_id", "horse_id"])
    res = res.merge(ent[["race_id", "horse_id", "odds_raw", "odds_open_raw"]], on=["race_id", "horse_id"], how="left")
    # Prefer the last price seen BEFORE the race (race_entries); fall back to the result page's price.
    res["price_raw"] = res["odds_raw"].where(res["odds_raw"].notna(), res["close_raw"])
    res["price_src"] = np.where(res["odds_raw"].notna(), "pre-race", np.where(res["close_raw"].notna(), "result-page", "none"))
    scale = (1.0 / odds_unit) if odds_unit else np.nan
    res["odds_dec"] = res["price_raw"] * scale
    res["odds_open_dec"] = res["odds_open_raw"] * scale
    res["margin_len"] = [parse_margin_len(m, p) for m, p in zip(res.get("margin", [None] * len(res)), res["position"])]

    rmap = races.set_index("id")
    fb = FeatureBuilder()
    frames = []
    for rid, g in sorted(res.groupby("race_id"), key=lambda kv: rmap.loc[kv[0], "dt"] if kv[0] in rmap.index else pd.Timestamp.max):
        if rid not in rmap.index or len(g) < MIN_FIELD:
            continue
        race = dict(race_id=rid, dt=rmap.loc[rid, "dt"], distance_m=rmap.loc[rid, "distance_m"],
                    class_num=rmap.loc[rid, "class_num"], prize=rmap.loc[rid, "prize"])
        g = g.sort_values("position")
        feats = fb.process_race(race, g, update=True)
        lab = g[["horse_id", "position", "price_src"]].reset_index(drop=True)
        feats = feats.merge(lab, on="horse_id", how="left")
        feats["dt"] = race["dt"]
        frames.append(feats)
    hist = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    if not hist.empty:
        hist["win"] = (hist["position"] == 1).astype(int)
        hist["top3"] = (hist["position"] <= 3).astype(int)
        # one winner per race expected; races with dead heats / missing winner are kept (win may be 0 or 2)
        info["n_races"], info["n_runners"] = hist["race_id"].nunique(), len(hist)
        info["odds_share_pre_race"] = float((hist["price_src"] == "pre-race").mean())
        info["odds_share_any"] = float((hist["price_src"] != "none").mean())
    else:
        info["n_races"] = info["n_runners"] = 0

    # --- upcoming races: scored with the history above (no updates) ---
    up_frames = []
    upcoming_ids = set(races.loc[races["status"] == "upcoming", "id"])
    for rid, g in ent[ent["race_id"].isin(upcoming_ids) & ent["horse_id"].notna()].groupby("race_id"):
        g = g.copy()
        g["odds_dec"] = g["odds_raw"] * scale
        g["odds_open_dec"] = g["odds_open_raw"] * scale
        race = dict(race_id=rid, dt=rmap.loc[rid, "dt"], distance_m=rmap.loc[rid, "distance_m"],
                    class_num=rmap.loc[rid, "class_num"], prize=rmap.loc[rid, "prize"])
        g["rating"] = g.get("rating", np.nan)
        up_frames.append(fb.process_race(race, g, update=False))
    upcoming = pd.concat(up_frames, ignore_index=True) if up_frames else pd.DataFrame()
    return hist, upcoming, fb, info
