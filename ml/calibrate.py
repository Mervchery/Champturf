"""Probability calibration fitted on the validation slice only, then applied unchanged to unseen races.
Raw model scores -> probabilities that match how often horses really win -> renormalised to sum to 1 per race."""
import json
import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression

ISOTONIC_MIN = 4000   # isotonic needs plenty of runners; below this use the smoother Platt scaling


def _logit(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def fit(raw_p, y):
    if len(y) >= ISOTONIC_MIN:
        iso = IsotonicRegression(y_min=1e-4, y_max=1 - 1e-4, out_of_bounds="clip").fit(raw_p, y)
        return {"kind": "isotonic", "x": [float(v) for v in iso.X_thresholds_], "y": [float(v) for v in iso.y_thresholds_]}
    lr = LogisticRegression(C=1e6).fit(_logit(raw_p).reshape(-1, 1), y)
    return {"kind": "platt", "a": float(lr.coef_[0][0]), "b": float(lr.intercept_[0])}


def apply(cal, raw_p):
    raw_p = np.asarray(raw_p, float)
    if cal["kind"] == "isotonic":
        return np.clip(np.interp(raw_p, cal["x"], cal["y"]), 1e-4, 1 - 1e-4)
    return 1 / (1 + np.exp(-(cal["a"] * _logit(raw_p) + cal["b"])))


def normalise_per_race(df, col, out_col):
    s = df.groupby("race_id")[col].transform("sum")
    df[out_col] = df[col] / s
    return df
