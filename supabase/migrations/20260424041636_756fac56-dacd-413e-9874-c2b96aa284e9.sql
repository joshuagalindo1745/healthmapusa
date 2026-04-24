CREATE TABLE public.county_health (
  fips TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  county TEXT NOT NULL,
  population NUMERIC,
  obesity_pct NUMERIC,
  diabetes_pct NUMERIC,
  physical_inactivity_pct NUMERIC,
  mental_distress_pct NUMERIC,
  food_insecurity_pct NUMERIC,
  limited_healthy_food_pct NUMERIC,
  food_environment_index NUMERIC,
  fast_food_per_1k NUMERIC,
  grocery_per_1k NUMERIC,
  snap_participation_pct NUMERIC,
  median_income NUMERIC,
  child_poverty_pct NUMERIC,
  uninsured_pct NUMERIC,
  rural_pct NUMERIC,
  smoking_pct NUMERIC,
  insufficient_sleep_pct NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_county_health_state_county ON public.county_health (lower(state), lower(county));

ALTER TABLE public.county_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County health data is publicly readable"
ON public.county_health
FOR SELECT
USING (true);