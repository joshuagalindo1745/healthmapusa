export interface ConditionResult {
  predicted: number;
  actual: number | null;
  diff: number | null;
  risk_level: "HIGH" | "LOW";
  threshold: number;
}

export interface Environment {
  food_insecurity_pct: number | null;
  fast_food_density: number | null;
  grocery_density: number | null;
  food_environment_index: number | null;
  snap_participation: number | null;
  median_income: number | null;
  poverty_rate: number | null;
  uninsured_pct: number | null;
  rural_pct: number | null;
  smoking_pct: number | null;
  insufficient_sleep_pct: number | null;
}

export interface PredictResponse {
  county: string;
  state: string;
  predictions: Record<string, ConditionResult>;
  ai_analysis: string;
  environment: Environment;
  high_risk_conditions: string[];
}

export type AppState = "idle" | "loading" | "success" | "error";

export const CONDITION_ORDER = [
  "Obesity",
  "Diabetes",
  "Physical Inactivity",
  "Mental Distress",
  "Food Insecurity",
] as const;
