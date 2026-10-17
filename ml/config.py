"""Settings for the Champ Turf prediction model. Everything tunable lives here."""
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Supertote shows 9999 when a runner has no price yet. It is a placeholder, never a real price.
NO_PRICE = 9999

# Tote prices are stored raw and the two sources use DIFFERENT units (same as lib/oddsFormat.ts, which is
# what the site shows): pre-race entry prices are the money back on a Rs 100 bet (370 -> 3.70), result-page
# prices are the money back on a Rs 10 bet (20 -> 2.00). Mixing them into one unit made upcoming prices ten
# times too big, or all missing when the unit could not be detected ("Form only - no prices yet").
ENTRY_UNIT = 100.0
RESULT_UNIT = 10.0
# Optional override for the entry unit only (kept for old setups).
ODDS_UNIT_OVERRIDE = float(os.environ["ODDS_UNIT"]) if os.environ.get("ODDS_UNIT") else None

# Not enough history -> the model refuses to train and the site says so instead of guessing.
MIN_RACES = 300            # completed races with positions
MIN_TEST_RACES = 60        # unseen races to measure on
MIN_FIELD = 4              # ignore tiny fields when training/testing

# Chronological split: oldest -> train, middle -> validation (early stopping + calibration), newest -> test.
TRAIN_FRAC, VAL_FRAC = 0.60, 0.20

XGB_PARAMS = dict(
    objective="binary:logistic", eval_metric="logloss",
    max_depth=3, eta=0.05, subsample=0.8, colsample_bytree=0.8,
    min_child_weight=5, reg_lambda=2.0, seed=7,
)
MAX_ROUNDS, EARLY_STOP = 600, 40

# "Value" = the model thinks the horse wins more often than its price implies.
VALUE_MIN_EDGE = 0.10      # win_prob x decimal_odds - 1  (expected profit per unit staked)
VALUE_MIN_PROB = 0.06
