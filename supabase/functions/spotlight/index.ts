// City Spotlight: returns tract GeoJSON + a chosen health metric per tract for a supported city.
// Data: Census TIGERweb (tract polygons) + CDC PLACES (tract-level health metrics).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Supported cities: name -> { state FIPS, list of county FIPS, state abbr, county names for PLACES, national benchmark }
// Benchmarks come from CDC PLACES national crude prevalence (2023).
type CityKey = "san-francisco" | "chicago" | "new-york-city";
interface CityCfg {
  label: string;
  state: string; // 2-digit FIPS
  counties: string[]; // 3-digit county FIPS
  stateAbbr: string;
  countyNames: string[]; // for PLACES filter (one per county)
  center: [number, number]; // lat, lng
  zoom: number;
}
const CITIES: Record<CityKey, CityCfg> = {
  "san-francisco": {
    label: "San Francisco",
    state: "06",
    counties: ["075"],
    stateAbbr: "CA",
    countyNames: ["San Francisco"],
    center: [37.7749, -122.4194],
    zoom: 12,
  },
  "chicago": {
    label: "Chicago",
    state: "17",
    counties: ["031"],
    stateAbbr: "IL",
    countyNames: ["Cook"],
    center: [41.8781, -87.6298],
    zoom: 11,
  },
  "new-york-city": {
    label: "New York City",
    state: "36",
    counties: ["005", "047", "061", "081", "085"], // Bronx, Kings, NY, Queens, Richmond
    stateAbbr: "NY",
    countyNames: ["Bronx", "Kings", "New York", "Queens", "Richmond"],
    center: [40.7128, -74.006],
    zoom: 10,
  },
};

// PLACES measure ids and friendly labels.
const METRICS: Record<string, { measureId: string; label: string; benchmark: number; description: string }> = {
  diabetes: {
    measureId: "DIABETES",
    label: "Diabetes",
    benchmark: 11.6,
    description: "Adults diagnosed with diabetes; reflects both health behaviors and access to care.",
  },
  obesity: {
    measureId: "OBESITY",
    label: "Obesity",
    benchmark: 33.7,
    description: "Adults with BMI ≥ 30. Strongly tied to food environment and physical activity.",
  },
  inactivity: {
    measureId: "LPA",
    label: "Physical Inactivity",
    benchmark: 25.3,
    description: "Adults reporting no leisure-time physical activity in the past month.",
  },
  mental: {
    measureId: "MHLTH",
    label: "Mental Distress",
    benchmark: 14.5,
    description: "Adults reporting 14+ poor mental health days in the past month.",
  },
  smoking: {
    measureId: "CSMOKING",
    label: "Smoking",
    benchmark: 16.2,
    description: "Adults who currently smoke cigarettes.",
  },
  hypertension: {
    measureId: "BPHIGH",
    label: "High Blood Pressure",
    benchmark: 32.6,
    description: "Adults diagnosed with high blood pressure.",
  },
};

// ---------------- Neighborhood crosswalk (point-in-polygon by tract centroid) ----------------
// Each city has an open-data GeoJSON of named neighborhoods. We cache them in module scope.
const NHOOD_SOURCES: Record<CityKey, { url: string; nameProp: string }> = {
  "san-francisco": {
    url: "https://data.sfgov.org/resource/ajp5-b2md.geojson",
    nameProp: "nhood",
  },
  "chicago": {
    url: "https://data.cityofchicago.org/resource/igwz-8jzy.geojson",
    nameProp: "community",
  },
  "new-york-city": {
    url: "https://data.cityofnewyork.us/resource/9nt8-h7nd.geojson",
    nameProp: "ntaname",
  },
};

type Ring = number[][];
type NhoodPoly = { name: string; rings: Ring[][]; bbox: [number, number, number, number] };
const nhoodCache: Partial<Record<CityKey, NhoodPoly[]>> = {};

function bboxOfRings(rings: Ring[][]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of rings) for (const ring of poly) for (const [x, y] of ring) {
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function pointInRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(x: number, y: number, polys: Ring[][]): boolean {
  for (const poly of polys) {
    if (poly.length === 0) continue;
    if (!pointInRing(x, y, poly[0])) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) if (pointInRing(x, y, poly[h])) { inHole = true; break; }
    if (!inHole) return true;
  }
  return false;
}

function centroidOfFeature(f: GeoJSON.Feature): [number, number] | null {
  const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  if (!g) return null;
  let sx = 0, sy = 0, n = 0;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of polys) {
    const ring = poly[0];
    for (const [x, y] of ring) { sx += x; sy += y; n++; }
  }
  return n ? [sx / n, sy / n] : null;
}

async function getNeighborhoods(cityKey: CityKey): Promise<NhoodPoly[]> {
  if (nhoodCache[cityKey]) return nhoodCache[cityKey]!;
  const src = NHOOD_SOURCES[cityKey];
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`Neighborhoods ${res.status}`);
  const json = await res.json();
  const out: NhoodPoly[] = [];
  for (const f of json.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    const rings: Ring[][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const name = f.properties?.[src.nameProp];
    if (!name) continue;
    const pretty = String(name).replace(/\b\w+/g, (w) =>
      w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()
    );
    out.push({ name: pretty, rings, bbox: bboxOfRings(rings) });
  }
  nhoodCache[cityKey] = out;
  return out;
}

function nhoodForCentroid(lng: number, lat: number, nhoods: NhoodPoly[]): string | null {
  for (const n of nhoods) {
    const [minX, minY, maxX, maxY] = n.bbox;
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) continue;
    if (pointInPolygon(lng, lat, n.rings)) return n.name;
  }
  return null;
}

async function fetchTracts(state: string, counties: string[]) {
  const where =
    counties.length === 1
      ? `STATE='${state}' AND COUNTY='${counties[0]}'`
      : `STATE='${state}' AND COUNTY IN (${counties.map((c) => `'${c}'`).join(",")})`;
  const url =
    `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query` +
    `?where=${encodeURIComponent(where)}` +
    `&outFields=GEOID,NAME&returnGeometry=true&f=geojson&outSR=4326`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TIGERweb ${res.status}`);
  const json = await res.json();
  if (json.error || !Array.isArray(json.features)) {
    throw new Error(`TIGERweb error: ${JSON.stringify(json.error ?? json).slice(0, 200)}`);
  }
  return json;
}

async function fetchPlaces(stateAbbr: string, countyNames: string[], measureId: string) {
  // CDC PLACES tract-level (cwsq-ngmh). Filter by state + county + measure.
  const inList = countyNames.map((n) => `'${n.replace(/'/g, "''")}'`).join(",");
  const where = `stateabbr='${stateAbbr}' AND countyname IN(${inList}) AND measureid='${measureId}' AND data_value_type='Crude prevalence'`;
  const url =
    `https://chronicdata.cdc.gov/resource/cwsq-ngmh.json?$where=${encodeURIComponent(where)}&$select=locationname,data_value&$limit=50000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PLACES ${res.status}`);
  const rows = (await res.json()) as Array<{ locationname: string; data_value: string }>;
  const map: Record<string, number> = {};
  for (const r of rows) {
    const v = parseFloat(r.data_value);
    if (!isNaN(v)) map[r.locationname] = v;
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const cityParam = (url.searchParams.get("city") || "").toLowerCase() as CityKey;
    const metricParam = (url.searchParams.get("metric") || "diabetes").toLowerCase();
    const city = CITIES[cityParam];
    const metric = METRICS[metricParam];
    if (!city) {
      return new Response(
        JSON.stringify({
          error: "city_unsupported",
          detail: "Data not yet available for this city — try San Francisco, Chicago, or New York City.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!metric) {
      return new Response(JSON.stringify({ error: "metric_unsupported" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [geo, values, nhoods] = await Promise.all([
      fetchTracts(city.state, city.counties),
      fetchPlaces(city.stateAbbr, city.countyNames, metric.measureId),
      getNeighborhoods(cityParam).catch(() => [] as NhoodPoly[]),
    ]);

    let red = 0, green = 0, none = 0;
    for (const f of geo.features) {
      const geoid = f.properties?.GEOID;
      const name = f.properties?.NAME;
      const v = geoid ? values[geoid] : undefined;
      let nhoodName: string | null = null;
      if (nhoods.length) {
        const c = centroidOfFeature(f);
        if (c) nhoodName = nhoodForCentroid(c[0], c[1], nhoods);
      }
      const tractLabel = name ? (String(name).startsWith("Census Tract") ? name : `Census Tract ${name}`) : "Unknown tract";
      f.properties = {
        ...f.properties,
        NAMELSAD: nhoodName ? `${nhoodName} · ${tractLabel}` : tractLabel,
        neighborhood: nhoodName,
        value: v ?? null,
        flag: v == null ? "none" : v > metric.benchmark ? "above" : "below",
      };
      if (v == null) none++;
      else if (v > metric.benchmark) red++;
      else green++;
    }

    return new Response(
      JSON.stringify({
        city: city.label,
        center: city.center,
        zoom: city.zoom,
        metric: { id: metricParam, label: metric.label, benchmark: metric.benchmark, description: metric.description },
        stats: { tracts: geo.features.length, red, green, none },
        geojson: geo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: "server_error", detail: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
