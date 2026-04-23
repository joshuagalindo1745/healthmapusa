// Predict edge function — geocodes a US address, builds reasonable county-level
// environment estimates, and asks Groq for an AI health analysis.
// NOTE: Real ML predictions require the FastAPI/XGBoost backend (deploy to Render).
// Until that is wired in, this function returns plausible mock predictions plus
// a real Groq-generated AI analysis.

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

const THRESHOLDS: Record<string, number> = {
  "Obesity": 30.0,
  "Diabetes": 11.0,
  "Physical Inactivity": 25.0,
  "Mental Distress": 13.0,
  "Food Insecurity": 15.0,
};

// Deterministic pseudo-random in [0,1) seeded by a string.
function seeded(s: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function near(rand: () => number, base: number, spread: number, min = 0): number {
  const v = base + (rand() - 0.5) * 2 * spread;
  return Math.max(min, Math.round(v * 10) / 10);
}

async function geocode(address: string): Promise<{ county: string; state: string } | null> {
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
  const rawCounty: string = addr.county ?? addr.city ?? addr.town ?? addr.village ?? "";
  const state: string = addr.state ?? "";
  if (!rawCounty || !state) return null;

  const county = rawCounty.replace(/\s+County$/i, "").replace(/\s+Parish$/i, "").trim();
  return { county, state };
}

function buildPredictions(seed: string) {
  const r = seeded(seed);
  const env = {
    food_insecurity_pct: near(r, 13, 4),
    fast_food_density: Math.round(near(r, 0.7, 0.3) * 100) / 100,
    grocery_density: Math.round(near(r, 0.25, 0.15) * 100) / 100,
    food_environment_index: near(r, 7.2, 1.5),
    snap_participation: near(r, 65, 15),
    median_income: Math.round(45000 + r() * 50000),
    poverty_rate: near(r, 13, 5),
    uninsured_pct: near(r, 11, 5),
    rural_pct: near(r, 20, 18),
    smoking_pct: near(r, 14, 4),
    insufficient_sleep_pct: near(r, 33, 4),
  };

  const baseline: Record<string, number> = {
    "Obesity": 31,
    "Diabetes": 11.5,
    "Physical Inactivity": 26,
    "Mental Distress": 14,
    "Food Insecurity": env.food_insecurity_pct,
  };

  const predictions: Record<string, ConditionResult> = {};
  const high: string[] = [];
  for (const name of Object.keys(THRESHOLDS)) {
    const predicted = near(r, baseline[name], 4);
    const actual = near(r, predicted, 1.2);
    const threshold = THRESHOLDS[name];
    const risk_level: "HIGH" | "LOW" = predicted >= threshold ? "HIGH" : "LOW";
    if (risk_level === "HIGH") high.push(name);
    predictions[name] = {
      predicted,
      actual,
      diff: Math.round((predicted - actual) * 10) / 10,
      risk_level,
      threshold,
    };
  }
  return { env, predictions, high };
}

async function aiAnalysis(
  county: string,
  state: string,
  predictions: Record<string, ConditionResult>,
  env: Record<string, number>,
  high: string[],
): Promise<string> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

  const summary = Object.entries(predictions)
    .map(([k, v]) => `- ${k}: predicted ${v.predicted}% (threshold ${v.threshold}%) — ${v.risk_level}`)
    .join("\n");

  const envSummary = Object.entries(env)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const prompt = `You are a public health analyst writing for residents of ${county} County, ${state}.

Health risk model output:
${summary}

County environment (raw inputs):
${envSummary}

High-risk conditions: ${high.length ? high.join(", ") : "none"}.

Write a 3–4 paragraph plain-text analysis (no markdown, no headings, no bullet lists). Cover:
1) What the predictions mean for residents in plain language.
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
        { role: "system", content: "You are a careful, plain-spoken public health analyst." },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    if (!address) {
      return new Response(JSON.stringify({ detail: "Missing 'address' in request body." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geo = await geocode(address);
    if (!geo) {
      return new Response(
        JSON.stringify({ detail: "Could not geocode address. Try a more specific US address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { county, state } = geo;
    const { env, predictions, high } = buildPredictions(`${county}|${state}`);

    let ai_analysis: string;
    try {
      ai_analysis = await aiAnalysis(county, state, predictions, env, high);
    } catch (e) {
      console.error("AI analysis error:", e);
      ai_analysis =
        `AI analysis is temporarily unavailable for ${county} County, ${state}. ` +
        `Please try again in a moment.`;
    }

    return new Response(
      JSON.stringify({
        county,
        state,
        predictions,
        ai_analysis,
        environment: env,
        high_risk_conditions: high,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
