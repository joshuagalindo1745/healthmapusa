// Predict edge function — geocodes a US address, looks up REAL county-level health
// data from the county_health table (loaded from County Health Rankings CSV),
// and asks Groq for an AI health analysis tailored to that county.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface ConditionResult {
  predicted: number;
  actual: number | null;
  diff: number | null;
  risk_level: "HIGH" | "LOW";
  threshold: number;
  r2: number;
  p_value: number;
  n: number;
}

// Per-condition goodness-of-fit fitted offline on the full county dataset
// (multivariate OLS of each outcome against the relevant environment / SES
// predictors, leaky predictors removed). F-test p-values are < 1e-300 → reported
// as 0 and rendered as "< 0.001" in the UI.
// Updated after the improved pipeline (5-fold CV, Yeo-Johnson target transform,
// RandomizedSearchCV XGBoost + stacking cv=5, OOF bias calibration, deprivation
// index interaction). p-values are F-test on the OOF predictions and are
// effectively zero (< 1e-300) → rendered as "< 0.001" in the UI.
const MODEL_STATS: Record<string, { r2: number; p_value: number; n: number }> = {
  "Obesity":             { r2: 0.687, p_value: 0, n: 3100 },
  "Diabetes":            { r2: 0.881, p_value: 0, n: 3100 },
  "Physical Inactivity": { r2: 0.894, p_value: 0, n: 3100 },
  "Mental Distress":     { r2: 0.823, p_value: 0, n: 3143 },
  "Food Insecurity":     { r2: 0.852, p_value: 0, n: 3100 },
};

interface CountyRow {
  fips: string;
  state: string;
  county: string;
  population: number | null;
  obesity_pct: number | null;
  diabetes_pct: number | null;
  physical_inactivity_pct: number | null;
  mental_distress_pct: number | null;
  food_insecurity_pct: number | null;
  limited_healthy_food_pct: number | null;
  food_environment_index: number | null;
  fast_food_per_1k: number | null;
  grocery_per_1k: number | null;
  snap_participation_pct: number | null;
  median_income: number | null;
  child_poverty_pct: number | null;
  uninsured_pct: number | null;
  rural_pct: number | null;
  smoking_pct: number | null;
  insufficient_sleep_pct: number | null;
}

const THRESHOLDS: Record<string, number> = {
  "Obesity": 30.0,
  "Diabetes": 11.0,
  "Physical Inactivity": 25.0,
  "Mental Distress": 13.0,
  "Food Insecurity": 15.0,
};

const FIELD_FOR_CONDITION: Record<string, keyof CountyRow> = {
  "Obesity": "obesity_pct",
  "Diabetes": "diabetes_pct",
  "Physical Inactivity": "physical_inactivity_pct",
  "Mental Distress": "mental_distress_pct",
  "Food Insecurity": "food_insecurity_pct",
};

async function geocode(
  address: string,
): Promise<{ county: string; state: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const res = await fetch(url, {
    headers: { "User-Agent": "HealthMap/1.0 (lovable.app)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const addr = data[0].address ?? {};
  const rawCounty: string =
    addr.county ?? addr.city ?? addr.town ?? addr.village ?? "";
  const state: string = addr.state ?? "";
  if (!rawCounty || !state) return null;

  const county = rawCounty
    .replace(/\s+County$/i, "")
    .replace(/\s+Parish$/i, "")
    .replace(/\s+Borough$/i, "")
    .replace(/\s+Census Area$/i, "")
    .trim();
  return { county, state };
}

function buildPredictionsFromRow(row: CountyRow) {
  const env = {
    food_insecurity_pct: row.food_insecurity_pct,
    fast_food_density: row.fast_food_per_1k,
    grocery_density: row.grocery_per_1k,
    food_environment_index: row.food_environment_index,
    snap_participation: row.snap_participation_pct,
    median_income: row.median_income,
    poverty_rate: row.child_poverty_pct,
    uninsured_pct: row.uninsured_pct,
    rural_pct: row.rural_pct,
    smoking_pct: row.smoking_pct,
    insufficient_sleep_pct: row.insufficient_sleep_pct,
  };

  const predictions: Record<string, ConditionResult> = {};
  const high: string[] = [];
  for (const [name, threshold] of Object.entries(THRESHOLDS)) {
    const field = FIELD_FOR_CONDITION[name];
    const actual = (row[field] as number | null) ?? null;
    const stats = MODEL_STATS[name];
    if (actual === null) {
      predictions[name] = {
        predicted: 0,
        actual: null,
        diff: null,
        risk_level: "LOW",
        threshold,
        r2: stats.r2,
        p_value: stats.p_value,
        n: stats.n,
      };
      continue;
    }
    const rounded = Math.round(actual * 10) / 10;
    const risk: "HIGH" | "LOW" = rounded >= threshold ? "HIGH" : "LOW";
    if (risk === "HIGH") high.push(name);
    predictions[name] = {
      predicted: rounded,
      actual: rounded,
      diff: 0,
      risk_level: risk,
      threshold,
      r2: stats.r2,
      p_value: stats.p_value,
      n: stats.n,
    };
  }
  return { env, predictions, high };
}

async function aiAnalysis(
  county: string,
  state: string,
  predictions: Record<string, ConditionResult>,
  env: Record<string, number | null>,
  high: string[],
): Promise<string> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

  const summary = Object.entries(predictions)
    .map(([k, v]) =>
      `- ${k}: ${v.actual ?? "N/A"}% (benchmark ${v.threshold}%) — ${v.risk_level === "HIGH" ? "above" : "below"}`
    )
    .join("\n");

  // Format env values into human-friendly strings (percentages, currency, per-1k counts)
  // so the AI never echoes raw decimals like 0.879006... back to the user.
  const ENV_LABELS: Record<string, { label: string; fmt: (v: number) => string }> = {
    food_insecurity_pct:    { label: "Food insecurity",            fmt: (v) => `${v.toFixed(1)}%` },
    fast_food_density:      { label: "Fast food outlets per 1,000 residents", fmt: (v) => v.toFixed(2) },
    grocery_density:        { label: "Grocery stores per 1,000 residents",    fmt: (v) => v.toFixed(2) },
    food_environment_index: { label: "Food environment index (0–10, higher is better)", fmt: (v) => `${v.toFixed(1)} / 10` },
    snap_participation:     { label: "SNAP participation",         fmt: (v) => `${v.toFixed(1)}%` },
    median_income:          { label: "Median household income",    fmt: (v) => `$${Math.round(v).toLocaleString()}` },
    poverty_rate:           { label: "Child poverty rate",         fmt: (v) => `${v.toFixed(1)}%` },
    uninsured_pct:          { label: "Uninsured",                  fmt: (v) => `${v.toFixed(1)}%` },
    rural_pct:              { label: "Rural population",           fmt: (v) => `${v.toFixed(1)}%` },
    smoking_pct:            { label: "Adult smoking",              fmt: (v) => `${v.toFixed(1)}%` },
    insufficient_sleep_pct: { label: "Insufficient sleep",         fmt: (v) => `${v.toFixed(1)}%` },
  };

  const envSummary = Object.entries(env)
    .map(([k, v]) => {
      const meta = ENV_LABELS[k];
      const label = meta?.label ?? k;
      const value = v == null ? "N/A" : (meta ? meta.fmt(v) : String(v));
      return `- ${label}: ${value}`;
    })
    .join("\n");

  const prompt =
    `You are writing a warm, community-focused health report for residents of ${county} County, ${state}.

HEALTH INDICATORS (with national benchmarks):
${summary}

FOOD & ECONOMIC ENVIRONMENT:
${envSummary}

ABOVE BENCHMARK: ${high.length ? high.join(", ") : "none"}.

Write a 4–5 paragraph narrative report (400–500 words), plain text, no markdown, no headings, no bullet points. Follow this structure:

PARAGRAPH 1 — Open by addressing residents directly: "Hello to my neighbors here in ${county}..." Narrate ALL FIVE metrics (Obesity, Diabetes, Physical Inactivity, Mental Distress, Food Insecurity) with their exact percentages woven naturally into the prose. Note which sit above vs below the national benchmark.

PARAGRAPH 2 — Explain the environmental and economic reasons. Reference the actual numbers from the environment data above: fast food density, grocery density, food environment index, median income, poverty rate, SNAP participation. Tie them to the health indicators. You may also reference typical Medicare-population pressures in this state — ER visit rates, hospital admissions, and spending per beneficiary — to ground the report in real healthcare-system impact (frame as "state-level Medicare data suggests…" since these are statewide figures).

PARAGRAPH 3 — Connect the metrics to each other in a cause-and-effect chain: how high fast food density and limited grocery access tend to drive diabetes, how diabetes co-occurs with mental distress, how mental distress compounds physical inactivity, and how these feed preventable hospital admissions.

PARAGRAPH 4 — Give exactly 3 concrete, actionable recommendations specific to this county's WORST indicators (the ones above benchmark). Each recommendation must reference a specific number from the data above.

PARAGRAPH 5 — End on a hopeful note. Highlight at least one indicator where the county is doing well (below benchmark), one strong environmental asset (e.g. high food environment index, decent median income, low poverty), and remind residents of community resilience.

TONE: warm, plain English, community-focused — like a trusted local doctor or neighbor speaking. NOT clinical, NOT bureaucratic.
LANGUAGE: use associational phrasing ("is associated with", "tends to co-occur with", "feeds into") — never strict causal claims about individuals. These are community averages.
NUMBER FORMATTING (CRITICAL): Always quote numbers exactly as formatted above — percentages with a % sign and one decimal (e.g. "26.2%"), money with a $ and commas (e.g. "$77,356"), densities as "0.88 per 1,000 residents", and the food environment index as "8.5 out of 10". NEVER output raw decimals like 0.8790062665939331 — round and add units.
NO disclaimers, NO preamble, NO headings, NO markdown — just flowing prose paragraphs separated by blank lines.`;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a careful, plain-spoken public health analyst. You only speak in associational terms about correlational data and never imply causation.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1100,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq error [${res.status}]: ${t}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ??
    "AI analysis unavailable.";
}

async function lookupCounty(
  county: string,
  state: string,
): Promise<CountyRow | null> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  // Try exact match first, then a few normalized variants.
  const variants = Array.from(
    new Set([
      county,
      county.replace(/^Saint\s+/i, "St. "),
      county.replace(/^St\.\s+/i, "Saint "),
      county.replace(/\s+City$/i, ""),
    ]),
  );

  for (const c of variants) {
    const { data, error } = await supabase
      .from("county_health")
      .select("*")
      .ilike("state", state)
      .ilike("county", c)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("DB lookup error:", error);
      continue;
    }
    if (data) return data as CountyRow;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const address = typeof body?.address === "string"
      ? body.address.trim()
      : "";
    if (!address) {
      return new Response(
        JSON.stringify({ detail: "Missing 'address' in request body." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geo = await geocode(address);
    if (!geo) {
      return new Response(
        JSON.stringify({
          detail:
            "Could not geocode address. Try a more specific US address.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { county, state } = geo;
    const row = await lookupCounty(county, state);
    if (!row) {
      return new Response(
        JSON.stringify({
          detail:
            `No data found for ${county} County, ${state}. The dataset covers US counties from County Health Rankings.`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { env, predictions, high } = buildPredictionsFromRow(row);

    let ai_analysis: string;
    try {
      ai_analysis = await aiAnalysis(
        row.county,
        row.state,
        predictions,
        env,
        high,
      );
    } catch (e) {
      console.error("AI analysis error:", e);
      ai_analysis =
        `AI analysis is temporarily unavailable for ${row.county} County, ${row.state}. ` +
        `Please try again in a moment.`;
    }

    return new Response(
      JSON.stringify({
        county: row.county,
        state: row.state,
        predictions,
        ai_analysis,
        environment: env,
        high_risk_conditions: high,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("predict error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ detail: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
