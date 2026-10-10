# Champ Turf prediction model

XGBoost win-probability model trained on Champ Turf's own scraped results. It never invents data: where a
field is missing the model treats it as missing, and with too little history it refuses to train and the site
says so.

## Set up (once)
1. Run `supabase/predictions_migration.sql` in the Supabase SQL editor (adds `model_runs` and `race_predictions`).
2. Run `supabase/clean_no_price_odds_migration.sql` (clears the old 9999 "no price" placeholders).
3. `pip install -r ml/requirements.txt` (Python 3.10+). Uses the same `.env.local` as the scraper.

## Train and test
```
npm run ml:train          # = python ml/train.py   (add --dry-run to skip saving the run)
```
It prints the unseen-race comparison and saves `ml/models/` (commit those files). Needs at least 300 finished
races and 60 unseen test races, otherwise it records "insufficient data" and the site shows that instead.

## Predict
```
npm run ml:predict        # = python ml/predict.py  (--dry-run prints without saving)
```
`.github/workflows/predict.yml` runs this twice an hour on race days. Retrain by hand every few weeks.

## What it uses (all known before the race)
Last 3–5 finishes and margins, form trend and consistency, win/top-3 rates, distance and class record, weight
and gate, days since last run, jockey and trainer records, and (model B) the last pre-race price, opening price,
movement since opening and the Supertote tip. Prices of 9999 are ignored. Supertote prices are converted to
decimal returns with a unit that is **detected from the data** (a race's implied probabilities must add up to
about 1.0–1.6), not assumed.

## No leakage
Races are processed in date/time order; a race's features come only from earlier races, and its own result is
added to the history afterwards. The same code scores upcoming races. `npm run ml:test` proves this: removing all
later races leaves a race's features unchanged. (It uses synthetic data and says nothing about real accuracy.)

## How it is judged
Oldest 60% of races train the model, the next 20% tune it and calibrate probabilities, and the newest 20% are
untouched until the final report. Reported for the model and for the **market favourite on the same races**:
win rate of the #1 pick, top-3 finish rate of the #1 pick, how often the winner is in the model's top three,
flat-stake ROI at the recorded price, Brier score and log loss, plus a 95% interval on the win-rate gap versus
the favourite. Two models: **A** form only, **B** form + market.

Limits to keep in mind: the backtest price is the last pre-race price when one was stored, otherwise the result
page's price (flagged in `info.odds_share_pre_race`); earlier-in-the-day prices are less informative. Results only
list finishers, so scratched runners are not in the history. Track condition, going and official class changes
are not structured in the database yet, so they are not used. No accuracy figure is promised — read the test
table the first run prints.
