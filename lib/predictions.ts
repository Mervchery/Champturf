import { createPublicClient as createClient } from "@/lib/supabase/public";

// Written by ml/predict.py and ml/train.py (see /ml). The site only reads them, and every
// reader here swallows errors so a missing table never breaks a race page.

export type Factor = { label: string; impact: number };

export type Prediction = {
  race_id: string;
  horse_id: string;
  model_version: string;
  win_prob: number;
  rank: number;
  confidence: "high" | "medium" | "low";
  uses_market: boolean;
  fair_odds: number | null;
  value_edge: number | null;
  is_value: boolean;
  factors: Factor[] | null;
};

export type ModelMetrics = {
  label: string;
  races: number;
  win_rate: number;
  top3_rate: number;
  winner_in_top3_picks: number;
  roi_top_pick: number | null;
  roi_bets: number;
  brier: number;
  log_loss: number;
  value_bets?: { bets: number; wins: number; roi: number | null };
};

export type ModelRun = {
  version: string;
  trained_at: string;
  status: "ready" | "insufficient_data";
  n_races: number;
  n_runners: number;
  n_test_races: number;
  test_from: string | null;
  test_to: string | null;
  notes: string | null;
  metrics: {
    metrics?: {
      test_races_with_prices?: number;
      market_favourite?: ModelMetrics;
      model_A?: ModelMetrics;
      model_B?: ModelMetrics;
      random_pick_win_rate?: number;
    } | null;
  } | null;
};

export async function getPredictionsForRace(raceId: string): Promise<Prediction[]> {
  try {
    const { data, error } = await createClient().from("race_predictions").select("*").eq("race_id", raceId).order("rank", { ascending: true });
    return error ? [] : ((data as Prediction[]) ?? []);
  } catch {
    return [];
  }
}

export async function getLatestModelRun(): Promise<ModelRun | null> {
  try {
    const { data, error } = await createClient().from("model_runs").select("*").order("trained_at", { ascending: false }).limit(1);
    return error || !data?.length ? null : (data[0] as ModelRun);
  } catch {
    return null;
  }
}
