-- Race predictions (XGBoost model, see /ml). Written by ml/predict.py with the service-role key;
-- the site only reads them. Safe to re-run.

create table if not exists public.model_runs (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  trained_at timestamptz not null default now(),
  status text not null check (status in ('ready', 'insufficient_data')),
  n_races int not null default 0,          -- completed races usable for training/testing
  n_runners int not null default 0,
  n_test_races int not null default 0,     -- unseen later races the metrics are measured on
  test_from date,
  test_to date,
  metrics jsonb,                           -- model vs market favourite (win rate, top-3, ROI, Brier, log loss)
  notes text
);

create table if not exists public.race_predictions (
  race_id uuid not null references public.races (id) on delete cascade,
  horse_id uuid not null references public.horses (id) on delete cascade,
  model_version text not null,
  win_prob numeric not null,               -- calibrated, sums to 1 within the race
  rank int not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  uses_market boolean not null default false,   -- true when live odds fed the prediction
  fair_odds numeric,                       -- 1 / win_prob, in the same decimal terms as the tote price
  value_edge numeric,                      -- win_prob x decimal odds - 1 (expected return per unit); null without odds
  is_value boolean not null default false,
  factors jsonb,                           -- [{label, impact}] strongest supporting factors
  created_at timestamptz not null default now(),
  primary key (race_id, horse_id)
);

alter table public.model_runs enable row level security;
alter table public.race_predictions enable row level security;
drop policy if exists "Public read model_runs" on public.model_runs;
drop policy if exists "Public read race_predictions" on public.race_predictions;
create policy "Public read model_runs" on public.model_runs for select using (true);
create policy "Public read race_predictions" on public.race_predictions for select using (true);
