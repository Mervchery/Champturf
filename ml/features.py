"""Point-in-time feature builder.

Races are walked in date/time order. For every race the features are computed from history that existed
BEFORE it, and only then is the race's own outcome added to that history. The same code scores upcoming
races (update=False), so training and live predictions can't drift apart and nothing from the future leaks in.
"""
from collections import defaultdict
import numpy as np
import pandas as pd

FORM_FEATURES = [
    "h_runs", "h_days_since", "h_last_pos", "h_avg3_pos", "h_avg5_pos", "h_best5_pos", "h_worst5_pos",
    "h_win5", "h_top3_5", "h_win_rate", "h_top3_rate", "h_last_margin", "h_avg3_margin",
    "h_consistency", "h_improve", "h_dist_runs", "h_dist_top3", "h_dist_change", "h_class_change",
    "h_last_rating", "h_weight_change", "h_best_pos_class",
    "j_runs", "j_win_rate", "j_top3_rate", "t_runs", "t_win_rate", "t_top3_rate", "jh_runs",
    "field_size", "distance_m", "class_num", "prize_log", "weight_kg", "weight_rel", "weight_rank",
    "gate", "gate_rel", "avg5_rel", "win_rate_rel", "rating_rel",
]
MARKET_FEATURES = ["odds_dec", "log_odds", "mkt_prob", "mkt_rank", "open_prob_ratio", "move_pct", "is_tipped"]
MODEL_A = FORM_FEATURES                    # fundamentals only — no prices
MODEL_B = FORM_FEATURES + MARKET_FEATURES  # fundamentals + the betting market

DIST_BAND = 200  # metres either side counts as "same distance"
PRIOR_STRENGTH = 8  # shrinkage: a rate over few runs is pulled toward the overall rate


def _shrunk(hits, n, prior):
    return (hits + PRIOR_STRENGTH * prior) / (n + PRIOR_STRENGTH)


class FeatureBuilder:
    def __init__(self):
        self.horse = defaultdict(list)           # horse_id -> list of runs (oldest first)
        self.jockey = defaultdict(lambda: [0, 0, 0])   # runs, wins, top3
        self.trainer = defaultdict(lambda: [0, 0, 0])
        self.jh = defaultdict(int)               # (jockey, horse) rides together
        self.g_runs = 0
        self.g_wins = 0
        self.g_top3 = 0

    # ---- priors known so far (never the future) ----
    def _prior_win(self):
        return self.g_wins / self.g_runs if self.g_runs else 0.1

    def _prior_top3(self):
        return self.g_top3 / self.g_runs if self.g_runs else 0.3

    def process_race(self, race, rows, update):
        """race: dict(dt, distance_m, class_num, prize). rows: DataFrame, one line per runner.
        Returns the feature frame; when update=True also needs rows['position'] / rows['margin_len']."""
        n = len(rows)
        pw, p3 = self._prior_win(), self._prior_top3()
        out = []
        for r in rows.itertuples(index=False):
            runs = self.horse.get(r.horse_id, []) if pd.notna(r.horse_id) else []
            last5, last3 = runs[-5:], runs[-3:]
            pos5 = [x["npos"] for x in last5]
            f = dict(race_id=race["race_id"], horse_id=r.horse_id)
            f["h_runs"] = len(runs)
            f["h_days_since"] = (race["dt"] - runs[-1]["dt"]).days if runs else np.nan
            f["h_last_pos"] = runs[-1]["npos"] if runs else np.nan
            f["h_avg3_pos"] = np.mean([x["npos"] for x in last3]) if last3 else np.nan
            f["h_avg5_pos"] = np.mean(pos5) if pos5 else np.nan
            f["h_best5_pos"] = min(pos5) if pos5 else np.nan
            f["h_worst5_pos"] = max(pos5) if pos5 else np.nan
            f["h_win5"] = sum(x["win"] for x in last5) if last5 else np.nan
            f["h_top3_5"] = sum(x["top3"] for x in last5) if last5 else np.nan
            f["h_win_rate"] = _shrunk(sum(x["win"] for x in runs), len(runs), pw)
            f["h_top3_rate"] = _shrunk(sum(x["top3"] for x in runs), len(runs), p3)
            m = [x["margin"] for x in last3 if not np.isnan(x["margin"])]
            f["h_last_margin"] = runs[-1]["margin"] if runs else np.nan
            f["h_avg3_margin"] = np.mean(m) if m else np.nan
            f["h_consistency"] = float(np.std(pos5)) if len(pos5) >= 3 else np.nan   # lower = steadier
            older = [x["npos"] for x in runs[-5:-2]]
            recent = [x["npos"] for x in runs[-2:]]
            f["h_improve"] = (np.mean(older) - np.mean(recent)) if len(runs) >= 4 and older and recent else np.nan  # >0 = improving
            near = [x for x in runs if not np.isnan(x["dist"]) and not np.isnan(race["distance_m"]) and abs(x["dist"] - race["distance_m"]) <= DIST_BAND]
            f["h_dist_runs"] = len(near)
            f["h_dist_top3"] = _shrunk(sum(x["top3"] for x in near), len(near), p3)
            f["h_dist_change"] = race["distance_m"] - runs[-1]["dist"] if runs else np.nan
            f["h_class_change"] = race["class_num"] - runs[-1]["cls"] if runs else np.nan
            rated = [x["rating"] for x in runs if not np.isnan(x["rating"])]
            f["h_last_rating"] = rated[-1] if rated else np.nan
            w = float(r.weight_kg) if pd.notna(r.weight_kg) else np.nan
            f["h_weight_change"] = w - runs[-1]["weight"] if runs else np.nan
            same_cls = [x["npos"] for x in runs if not np.isnan(x["cls"]) and not np.isnan(race["class_num"]) and abs(x["cls"] - race["class_num"]) <= 4]
            f["h_best_pos_class"] = min(same_cls) if same_cls else np.nan

            j = self.jockey[r.jockey_id] if pd.notna(r.jockey_id) else [0, 0, 0]
            t = self.trainer[r.trainer_id] if pd.notna(r.trainer_id) else [0, 0, 0]
            f["j_runs"], f["j_win_rate"], f["j_top3_rate"] = j[0], _shrunk(j[1], j[0], pw), _shrunk(j[2], j[0], p3)
            f["t_runs"], f["t_win_rate"], f["t_top3_rate"] = t[0], _shrunk(t[1], t[0], pw), _shrunk(t[2], t[0], p3)
            f["jh_runs"] = self.jh[(r.jockey_id, r.horse_id)]

            f["field_size"] = n
            f["distance_m"] = race["distance_m"]
            f["class_num"] = race["class_num"]
            f["prize_log"] = np.log1p(race["prize"]) if pd.notna(race["prize"]) else np.nan
            f["weight_kg"] = w
            f["gate"] = float(r.gate) if pd.notna(r.gate) else np.nan
            f["gate_rel"] = f["gate"] / n if not np.isnan(f["gate"]) else np.nan

            # market (kept in its own columns so model A can ignore them)
            d, o = r.odds_dec, r.odds_open_dec
            f["odds_dec"] = d
            f["log_odds"] = np.log(d) if pd.notna(d) else np.nan
            f["_open_dec"] = o
            f["move_pct"] = (d - o) / o if pd.notna(d) and pd.notna(o) and o > 0 else np.nan  # <0 firmed, >0 drifted
            f["is_tipped"] = float(bool(r.is_tipped)) if pd.notna(r.is_tipped) else np.nan
            out.append(f)

        df = pd.DataFrame(out)
        # race-relative features (computed within the race only)
        df["weight_rel"] = df["weight_kg"] - df["weight_kg"].mean()
        df["weight_rank"] = df["weight_kg"].rank(ascending=False, method="min")
        df["avg5_rel"] = df["h_avg5_pos"] - df["h_avg5_pos"].mean()
        df["win_rate_rel"] = df["h_win_rate"] - df["h_win_rate"].mean()
        df["rating_rel"] = df["h_last_rating"] - df["h_last_rating"].mean()
        inv = 1.0 / df["odds_dec"]
        df["mkt_prob"] = inv / inv.sum() if inv.notna().sum() >= max(3, int(0.7 * n)) else np.nan
        df["mkt_rank"] = df["odds_dec"].rank(method="min")
        df["open_prob_ratio"] = df["odds_dec"] / df["_open_dec"]
        df = df.drop(columns=["_open_dec"])

        if update:
            self._update(race, rows, n)
        return df

    def _update(self, race, rows, n):
        for r in rows.itertuples(index=False):
            pos = int(r.position)
            npos = (pos - 1) / (n - 1) if n > 1 else 0.5
            win, top3 = int(pos == 1), int(pos <= 3)
            if pd.notna(r.horse_id):
                self.horse[r.horse_id].append(dict(
                    dt=race["dt"], npos=npos, win=win, top3=top3, margin=getattr(r, "margin_len", np.nan),
                    dist=race["distance_m"], cls=race["class_num"],
                    rating=float(r.rating) if pd.notna(r.rating) else np.nan,
                    weight=float(r.weight_kg) if pd.notna(r.weight_kg) else np.nan))
            for store, key in ((self.jockey, r.jockey_id), (self.trainer, r.trainer_id)):
                if pd.notna(key):
                    store[key][0] += 1; store[key][1] += win; store[key][2] += top3
            if pd.notna(r.jockey_id) and pd.notna(r.horse_id):
                self.jh[(r.jockey_id, r.horse_id)] += 1
            self.g_runs += 1; self.g_wins += win; self.g_top3 += top3
