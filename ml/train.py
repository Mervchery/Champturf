"""Train, calibrate and honestly test the Champ Turf model.

    python ml/train.py            # reads Supabase, trains, backtests, saves ml/models/, records the run
    python ml/train.py --dry-run  # same, but does not write the run to the database

Chronological split: oldest 60% train, next 20% validation (early stopping + calibration),
newest 20% is never touched until the final report. Two models are trained:
  A  form only (no prices)         B  form + betting market (odds, movement, tip)
and both are compared with simply backing the market favourite on the same unseen races.
"""
import json, os, sys, datetime as dt
import numpy as np
import pandas as pd
import xgboost as xgb
import calibrate, metrics
from config import *
from features import MODEL_A, MODEL_B


def split_by_race(hist):
    races = hist[["race_id", "dt"]].drop_duplicates().sort_values("dt")["race_id"].tolist()
    n = len(races)
    a, b = int(n * TRAIN_FRAC), int(n * (TRAIN_FRAC + VAL_FRAC))
    return set(races[:a]), set(races[a:b]), set(races[b:])


def fit_model(train, val, feats):
    dtr = xgb.DMatrix(train[feats], label=train["win"], missing=np.nan)
    dva = xgb.DMatrix(val[feats], label=val["win"], missing=np.nan)
    booster = xgb.train(XGB_PARAMS, dtr, MAX_ROUNDS, evals=[(dva, "val")], early_stopping_rounds=EARLY_STOP, verbose_eval=False)
    return booster


def predict_raw(booster, df, feats):
    return booster.predict(xgb.DMatrix(df[feats], missing=np.nan), iteration_range=(0, booster.best_iteration + 1))


def run(hist, info, dry_run=False, save=True):
    """Returns the metrics dict (status 'insufficient_data' when there isn't enough history)."""
    result = {"status": "insufficient_data", "n_races": info.get("n_races", 0), "n_runners": info.get("n_runners", 0), "info": info}
    if info.get("n_races", 0) < MIN_RACES:
        result["notes"] = f"Only {info.get('n_races', 0)} finished races with usable results; at least {MIN_RACES} are needed. No model was trained and no predictions are shown."
        return result
    tr_ids, va_ids, te_ids = split_by_race(hist)
    if len(te_ids) < MIN_TEST_RACES:
        result["notes"] = f"Only {len(te_ids)} unseen test races; at least {MIN_TEST_RACES} are needed to judge the model."
        return result
    train, val, test = (hist[hist["race_id"].isin(s)].copy() for s in (tr_ids, va_ids, te_ids))
    version = dt.datetime.utcnow().strftime("v%Y%m%d%H%M")
    models, report = {}, {}

    for name, feats in (("A", MODEL_A), ("B", MODEL_B)):
        if name == "B" and (test["odds_dec"].notna().mean() < 0.5 or train["odds_dec"].notna().mean() < 0.5):
            report["B"] = {"skipped": "fewer than half of runners have prices"}
            continue
        booster = fit_model(train, val, feats)
        cal = calibrate.fit(predict_raw(booster, val, feats), val["win"].to_numpy())
        test["raw_" + name] = predict_raw(booster, test, feats)
        test["cal_" + name] = calibrate.apply(cal, test["raw_" + name])
        test = calibrate.normalise_per_race(test, "cal_" + name, "p_" + name)
        models[name] = (booster, cal, feats)
        report[name] = {"rounds": int(booster.best_iteration + 1), "calibration": cal["kind"]}

    # ---- unseen-race comparison with the market favourite, on identical races ----
    priced = test.groupby("race_id")["odds_dec"].transform(lambda s: s.notna().mean()) >= 0.8
    cmp_df = test[priced].copy()
    cmp_df["fav_score"] = 1.0 / cmp_df["odds_dec"]
    cmp_df["fav_score"] = cmp_df["fav_score"].fillna(0)
    cmp_df["mkt_p"] = cmp_df["mkt_prob"]
    cmp_df = cmp_df.dropna(subset=["mkt_p"])
    result["metrics"] = {"test_races_with_prices": int(cmp_df["race_id"].nunique()), "test_races_total": int(test["race_id"].nunique())}
    if not cmp_df.empty:
        result["metrics"]["market_favourite"] = metrics.evaluate(cmp_df, "mkt_p", "Market favourite")
        for name in models:
            sub = cmp_df.dropna(subset=["p_" + name])
            result["metrics"]["model_" + name] = metrics.evaluate(sub, "p_" + name, f"Model {name}")
            result["metrics"]["model_" + name]["value_bets"] = metrics.value_roi(sub, "p_" + name, VALUE_MIN_EDGE, VALUE_MIN_PROB)
            result["metrics"]["model_" + name]["win_rate_vs_favourite_95ci"] = metrics.bootstrap_diff(sub, "p_" + name, "odds_dec")
            result["metrics"]["model_" + name]["reliability"] = metrics.reliability(sub, "p_" + name)
        field = cmp_df.groupby("race_id")["win"].transform("size")
        result["metrics"]["random_pick_win_rate"] = float((1.0 / field).groupby(cmp_df["race_id"]).first().mean())
    # model A can be tested on every test race (no prices needed)
    if "A" in models:
        result["metrics"]["model_A_all_test_races"] = metrics.evaluate(test.dropna(subset=["p_A"]), "p_A", "Model A (all test races)")
    result.update(status="ready", version=version, n_test_races=int(test["race_id"].nunique()),
                  test_from=str(test["dt"].min().date()), test_to=str(test["dt"].max().date()), models_report=report,
                  notes=("Backtest uses prices from the last pre-race scrape where available, otherwise the result page's price. "
                         "Live predictions earlier in the day see less informative prices than these."))
    if save and models:
        os.makedirs(MODEL_DIR, exist_ok=True)
        meta = {"version": version, "odds_unit": info.get("odds_unit"), "models": {}}
        for name, (booster, cal, feats) in models.items():
            booster.save_model(os.path.join(MODEL_DIR, f"model_{name}.json"))
            meta["models"][name] = {"features": feats, "calibration": cal, "best_iteration": int(booster.best_iteration)}
        json.dump(meta, open(os.path.join(MODEL_DIR, "meta.json"), "w"), indent=1)
    return result


def summarise(r):
    if r["status"] != "ready":
        print("INSUFFICIENT DATA:", r.get("notes"))
        return
    m = r["metrics"]
    print(f"\nTest: {r['n_test_races']} unseen races ({r['test_from']} -> {r['test_to']}); {m['test_races_with_prices']} have prices for the comparison")
    keys = ["market_favourite", "model_A", "model_B"]
    cols = ["win_rate", "top3_rate", "winner_in_top3_picks", "roi_top_pick", "brier", "log_loss"]
    print(f"{'':20}" + "".join(f"{c:>22}" for c in cols))
    for k in keys:
        if k in m:
            print(f"{m[k]['label']:20}" + "".join(f"{(m[k][c] if m[k][c] is not None else float('nan')):>22.4f}" for c in cols))
    print("random pick win rate:", round(m.get("random_pick_win_rate", float("nan")), 4))
    for k in ("model_A", "model_B"):
        if k in m:
            print(k, "value bets:", m[k]["value_bets"], "| win-rate difference vs favourite 95% CI:", m[k]["win_rate_vs_favourite_95ci"])


def record(db, r):
    row = dict(version=r.get("version") or dt.datetime.utcnow().strftime("insufficient-%Y%m%d%H%M"), status=r["status"],
               n_races=r["n_races"], n_runners=r["n_runners"], n_test_races=r.get("n_test_races", 0),
               test_from=r.get("test_from"), test_to=r.get("test_to"),
               metrics={"metrics": r.get("metrics"), "models": r.get("models_report"), "info": r.get("info")}, notes=r.get("notes"))
    db.upsert("model_runs", [json.loads(json.dumps(row, default=str))], "version")


if __name__ == "__main__":
    from data import Supabase, load_tables
    from dataset import build
    db = Supabase()
    races, results, entries = load_tables(db)
    hist, upcoming, fb, info = build(races, results, entries)
    print("Data:", {k: v for k, v in info.items()})
    r = run(hist, info)
    summarise(r)
    if "--dry-run" not in sys.argv:
        record(db, r)
        print("Run recorded." if r["status"] == "ready" else "Insufficient-data status recorded (site will say so).")
