"""Settings for the Champ Turf prediction model. Everything tunable lives here."""
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Supertote shows 9999 when a runner has no price yet. It is a placeholder, never a real price.
NO_PRICE = 9999

# Tote prices are stored raw (e.g. "590"). The unit that turns them into decimal returns
# (590 -> 5.90) is detected from the data in data.detect_odds_unit(); set ODDS_UNIT=100 to force it.
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
