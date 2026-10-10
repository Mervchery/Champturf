"""Win rate, top-3 strike rate, ROI, Brier score and log loss — for the model and for the market favourite
on exactly the same races."""
import numpy as np
import pandas as pd

EPS = 1e-6


def _picks(df, col, ascending=False):
    """The runner each race 'chooses' under `col` (highest probability, or lowest price)."""
    idx = df.groupby("race_id")[col].transform("min" if ascending else "max") == df[col]
    return df[idx].drop_duplicates("race_id")  # ties -> first listed


def evaluate(df, prob_col, label):
    """df: runner rows with race_id, win, top3, odds_dec, mkt_prob and `prob_col` (sums to 1 per race)."""
    d = df.copy()
    top = _picks(d, prob_col)
    out = {"label": label, "races": int(d["race_id"].nunique())}
    out["win_rate"] = float(top["win"].mean())                      # the #1 pick wins
    out["top3_rate"] = float(top["top3"].mean())                    # the #1 pick finishes in the first three
    # how often the actual winner is inside the model's top three picks
    d["_rk"] = d.groupby("race_id")[prob_col].rank(ascending=False, method="first")
    out["winner_in_top3_picks"] = float(d[d["_rk"] <= 3].groupby("race_id")["win"].max().reindex(d["race_id"].unique()).fillna(0).mean())
    priced = top.dropna(subset=["odds_dec"])
    out["roi_top_pick"] = _roi(priced)
    out["roi_bets"] = int(len(priced))
    # race-level log loss on the winner; runner-level Brier
    w = d[d["win"] == 1].drop_duplicates("race_id")
    out["log_loss"] = float(-np.mean(np.log(np.clip(w[prob_col], EPS, 1))))
    out["brier"] = float(np.mean((d[prob_col] - d["win"]) ** 2))
    return out


def _roi(picks):
    if picks.empty:
        return None
    stake = len(picks)
    ret = float((picks["win"] * picks["odds_dec"]).sum())
    return round((ret - stake) / stake, 4)


def value_roi(df, prob_col, min_edge, min_prob):
    d = df.dropna(subset=["odds_dec"]).copy()
    d["edge"] = d[prob_col] * d["odds_dec"] - 1
    bets = d[(d["edge"] >= min_edge) & (d[prob_col] >= min_prob)]
    return {"bets": int(len(bets)), "wins": int(bets["win"].sum()), "roi": _roi(bets.assign(win=bets["win"]))}


def bootstrap_diff(df, a_col, b_col, n=1000, seed=7):
    """95% interval for (model top-pick win rate - favourite win rate), resampling whole races."""
    rng = np.random.default_rng(seed)
    a = _picks(df, a_col).set_index("race_id")["win"]
    b = _picks(df.dropna(subset=["odds_dec"]), b_col, ascending=True).set_index("race_id")["win"]
    ids = a.index.intersection(b.index)
    if len(ids) < 20:
        return None
    diff = (a.loc[ids] - b.loc[ids]).to_numpy()
    boots = [rng.choice(diff, len(diff)).mean() for _ in range(n)]
    return [round(float(np.percentile(boots, 2.5)), 4), round(float(np.percentile(boots, 97.5)), 4)]


def reliability(df, prob_col, bins=8):
    """Predicted vs actual win rate by probability bucket — is a '20%' horse really winning ~20%?"""
    d = df.copy()
    d["bin"] = pd.qcut(d[prob_col], q=bins, duplicates="drop")
    t = d.groupby("bin", observed=True).agg(pred=(prob_col, "mean"), actual=("win", "mean"), n=("win", "size")).reset_index(drop=True)
    return [{"pred": round(float(r.pred), 4), "actual": round(float(r.actual), 4), "n": int(r.n)} for r in t.itertuples()]
