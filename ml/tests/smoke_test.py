"""Code check on SYNTHETIC data (random horses with a hidden ability). It proves the pipeline runs end to end
and that features cannot see the future. It says NOTHING about real Mauritian racing accuracy — never quote its numbers.

    python ml/tests/smoke_test.py
"""
import os, sys, uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import numpy as np, pandas as pd
import train, dataset
from data import parse_distance_m, parse_class_num


def synth(n_races=520, seed=3):
    rng = np.random.default_rng(seed)
    horses = [str(uuid.uuid4()) for _ in range(160)]; ability = dict(zip(horses, rng.normal(0, 1, 160)))
    jockeys = [str(uuid.uuid4()) for _ in range(14)]; trainers = [str(uuid.uuid4()) for _ in range(10)]
    start = pd.Timestamp("2024-01-06"); races, res, ent = [], [], []
    for i in range(n_races):
        rid = str(uuid.uuid4()); day = start + pd.Timedelta(days=7 * (i // 8)); t = f"{12 + (i % 8)}:30:00"
        races.append(dict(id=rid, name=f"R{i}", race_date=str(day.date()), race_time=t, distance=f"{rng.choice([1000, 1200, 1400, 1600])}m",
                          race_class=f"BM{rng.choice([30, 36, 42])}", prize=float(rng.integers(100, 400) * 1000), status="completed"))
        field = list(rng.choice(horses, int(rng.integers(6, 13)), replace=False))
        score = np.array([ability[h] + rng.normal(0, 1) for h in field]); order = np.argsort(-score)
        strength = np.exp(np.array([ability[h] for h in field])); price = 1 / (strength / strength.sum()) / 1.2 * rng.uniform(.9, 1.1, len(field))  # tote margin: implied probs sum to ~1.2
        for pos, k in enumerate(order, 1):
            h = field[k]
            res.append(dict(race_id=rid, horse_id=h, position=pos, jockey_id=rng.choice(jockeys), trainer_id=rng.choice(trainers),
                            weight_kg=float(rng.integers(52, 62)), gate=int(k + 1), margin=f"{pos * 0.7:.1f}", rating=int(40 + 5 * ability[h]),
                            win_odds=str(int(price[k] * 100)) if rng.random() > .1 else "9999", is_tipped=False))
        for k, h in enumerate(field):
            ent.append(dict(race_id=rid, horse_id=h, jockey_id=None, trainer_id=None, weight_kg=57.0, gate=k + 1, rating=None,
                            odds=str(int(price[k] * 100 * rng.uniform(.97, 1.03))), odds_open=str(int(price[k] * 100 * rng.uniform(.9, 1.2))),
                            odds_prev=None, is_tipped=False))
    races = pd.DataFrame(races); races["dt"] = pd.to_datetime(races["race_date"] + " " + races["race_time"])
    races["distance_m"] = races["distance"].map(parse_distance_m); races["class_num"] = races["race_class"].map(parse_class_num)
    return races, pd.DataFrame(res), pd.DataFrame(ent)


def main():
    races, results, entries = synth()
    hist, upcoming, fb, info = dataset.build(races, results, entries)
    print("odds unit detected:", info["odds_unit"], info["odds_unit_check"])
    assert info["odds_unit"] == 100.0, "unit detection should find 100 for prices stored x100"
    assert (hist["odds_dec"].dropna() < 9999 / 100).all(), "9999 placeholders must never become prices"

    # --- no-leakage check: cut the history at race k; race k's features must be identical ---
    k = hist["race_id"].drop_duplicates().iloc[300]; cutoff = hist.loc[hist["race_id"] == k, "dt"].iloc[0]
    sub_races = races[races["dt"] <= cutoff]; sub_results = results[results["race_id"].isin(sub_races["id"])]
    sub_entries = entries[entries["race_id"].isin(sub_races["id"])]
    hist2, _, _, _ = dataset.build(sub_races, sub_results, sub_entries, odds_unit=100.0)
    a = hist[hist["race_id"] == k].sort_values("horse_id").drop(columns=["position", "win", "top3", "price_src"]).reset_index(drop=True)
    b = hist2[hist2["race_id"] == k].sort_values("horse_id").drop(columns=["position", "win", "top3", "price_src"]).reset_index(drop=True)
    pd.testing.assert_frame_equal(a, b, check_dtype=False)
    print("leakage check passed: features for a race are unchanged when all later races are removed")

    r = train.run(hist, info, save=False)
    train.summarise(r)
    assert r["status"] == "ready"
    small = dataset.build(races.head(30), results[results["race_id"].isin(races.head(30)["id"])], entries, odds_unit=100.0)
    r2 = train.run(small[0], small[3]); print("small data ->", r2["status"], "|", r2["notes"])
    assert r2["status"] == "insufficient_data"
    print("SMOKE TEST OK (synthetic data — these numbers say nothing about real racing)")


if __name__ == "__main__":
    main()
