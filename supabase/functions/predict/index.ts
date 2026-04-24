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
}

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
    if (actual === null) {
      predictions[name] = {
        predicted: 0,
        actual: null,
        diff: null,
        risk_level: "LOW",
        threshold,
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
      `- ${k}: ${v.actual ?? "N/A"}% (threshold ${v.threshold}%) — ${v.risk_level}`
    )
    .join("\n");

  const envSummary = Object.entries(env)
    .map(([k, v]) => `- ${k}: ${v ?? "N/A"}`)
    .join("\n");

  const prompt =
    `You are a public health analyst writing for residents of ${county} County, ${state}. The numbers below come from the County Health Rankings & Roadmaps dataset.

Health indicators:
${summary}

County environment:
${envSummary}

High-risk conditions: ${high.length ? high.join(", ") : "none"}.

Write a 3–4 paragraph plain-text analysis (no markdown, no headings, no bullet lists). Cover:
1) What these numbers mean for residents in plain language.
2) Which environmental/economic factors most likely drive the high-risk conditions.
3) 3–5 concrete, locally relevant recommendations residents and local leaders can act on.

Keep it warm, specific to this county's data, and avoid medical advice disclaimers.`;

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
            "You are a careful, plain-spoken public health analyst.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 900,
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
