import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CITIES, METRICS, type CityOption } from "@/data/cities";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SpotlightMap } from "@/components/spotlight/SpotlightMap";
import { supabase } from "@/integrations/supabase/client";

interface FeatureProps {
  GEOID: string;
  NAMELSAD: string;
  NAME: string;
  value: number | null;
  flag: "above" | "below" | "none";
}
interface SpotlightData {
  city: string;
  center: [number, number];
  zoom: number;
  metric: { id: string; label: string; benchmark: number; description: string };
  stats: { tracts: number; red: number; green: number; none: number };
  geojson: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, FeatureProps>;
}

const FUNCTIONS_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

const Spotlight = () => {
  const [query, setQuery] = useState("San Francisco");
  const [city, setCity] = useState<CityOption>(
    CITIES.find((c) => c.slug === "san-francisco")!,
  );
  const [metric, setMetric] = useState<string>("diabetes");
  const [open, setOpen] = useState(false);
  const [unsupportedMsg, setUnsupportedMsg] = useState<string | null>(null);
  const [data, setData] = useState<SpotlightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, FeatureProps> | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES.slice(0, 8);
    return CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const load = async (slug: string, m: string) => {
    setLoading(true);
    setError(null);
    setUnsupportedMsg(null);
    setData(null);
    setSelected(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${FUNCTIONS_BASE}/spotlight?city=${encodeURIComponent(slug)}&metric=${encodeURIComponent(m)}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        },
      );
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "city_unsupported") setUnsupportedMsg(json.detail);
        else setError(json.detail || "Failed to load city data.");
        return;
      }
      setData(json as SpotlightData);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    load(city.slug, metric);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => {
    if (!city.supported) {
      setUnsupportedMsg(
        `Data not yet available for ${city.name} — try San Francisco, Chicago, or New York City.`,
      );
      setData(null);
      return;
    }
    load(city.slug, metric);
  };

  const pickCity = (c: CityOption) => {
    setCity(c);
    setQuery(c.name);
    setOpen(false);
  };

  const onMetricChange = (id: string) => {
    setMetric(id);
    if (city.supported) load(city.slug, id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-hero pt-24">
        <section className="max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-4 text-center">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">
            City Health Spotlight
          </p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            See health risks block by block.
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pick a city and a metric. Each neighborhood is flagged red if it scores worse than
            the national benchmark, green if better.
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-4 md:px-8 pb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-1.5 sm:rounded-lg sm:shadow-card sm:border sm:border-border sm:bg-card sm:p-1.5">
            <div ref={inputRef} className="relative flex-1 min-w-0">
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                  const exact = CITIES.find(
                    (c) => c.name.toLowerCase() === e.target.value.toLowerCase(),
                  );
                  if (exact) setCity(exact);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (matches[0]) pickCity(matches[0]);
                    onSearch();
                  }
                }}
                placeholder="Search a city (e.g. San Francisco)"
                className="h-12 sm:border-0 sm:shadow-none sm:focus-visible:ring-0 text-base"
                aria-label="City"
              />
              {open && matches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-md shadow-card-hover z-30 overflow-hidden">
                  {matches.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => pickCity(c)}
                      className="w-full text-left px-4 py-2 hover:bg-secondary transition-base flex items-center justify-between gap-2"
                    >
                      <span className="text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground">, {c.state}</span>
                      </span>
                      {c.supported ? (
                        <span className="text-[10px] font-semibold tracking-wide bg-primary-soft text-primary-deep px-2 py-0.5 rounded-md">
                          DATA
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">coming soon</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={metric}
              onChange={(e) => onMetricChange(e.target.value)}
              className="h-12 sm:w-48 shrink-0 bg-transparent px-3 text-sm font-medium focus:outline-none rounded-md sm:border-0 border border-border"
              aria-label="Metric"
            >
              {METRICS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <Button
              onClick={onSearch}
              disabled={loading}
              className="h-12 px-6 font-semibold gap-2 shrink-0"
            >
              <Search className="h-4 w-4" />
              {loading ? "Loading…" : "Search"}
            </Button>
          </div>

          {unsupportedMsg && (
            <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 flex items-start gap-3 text-sm">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <p>{unsupportedMsg}</p>
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive-soft text-destructive-deep px-4 py-3 text-sm">
              {error}
            </div>
          )}
        </section>

        {data && (
          <section className="max-w-6xl mx-auto px-4 md:px-8 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div className="bg-card border border-border rounded-xl shadow-card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <h2 className="font-semibold">
                  {data.city} — {data.metric.label}
                </h2>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {data.stats.tracts} tracts · {data.stats.red} red · {data.stats.green} green · {data.stats.none} no data
                </p>
              </div>
              <SpotlightMap
                data={data}
                onSelect={(f) => setSelected(f)}
                selectedGeoid={selected?.properties.GEOID ?? null}
              />
              <p className="text-[11px] text-muted-foreground mt-3">
                Educational tool. Not medical advice. Tract data: CDC PLACES (BRFSS-derived crude prevalence). Boundaries: US Census TIGER/Line.
              </p>
            </div>

            <aside className="bg-card border border-border rounded-xl shadow-card p-4 h-fit lg:sticky lg:top-24">
              {selected ? (
                <>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs text-muted-foreground">{data.city}</p>
                    <button
                      onClick={() => setSelected(null)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold mb-3">{selected.properties.NAMELSAD}</h3>
                  {(() => {
                    const v = selected.properties.value;
                    const b = data.metric.benchmark;
                    if (v == null) {
                      return (
                        <div className="bg-secondary text-muted-foreground text-xs px-3 py-2 rounded-md mb-3">
                          No data available for this tract.
                        </div>
                      );
                    }
                    const above = v > b;
                    const diff = Math.abs(v - b).toFixed(1);
                    return (
                      <div
                        className={
                          "text-xs font-semibold px-3 py-2 rounded-md mb-3 " +
                          (above
                            ? "bg-destructive-soft text-destructive-deep"
                            : "bg-primary-soft text-primary-deep")
                        }
                      >
                        {diff} pp {above ? "above" : "below"} benchmark
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-secondary rounded-md p-3">
                      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                        {data.metric.label}
                      </p>
                      <p className="text-2xl font-bold tabular-nums">
                        {selected.properties.value == null ? "—" : `${selected.properties.value.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="bg-secondary rounded-md p-3">
                      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                        Benchmark
                      </p>
                      <p className="text-2xl font-bold tabular-nums">
                        {data.metric.benchmark.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{data.metric.description}</p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <p className="font-medium text-foreground mb-1">Click a tract</p>
                  <p>Tap any neighborhood on the map to see its {data.metric.label.toLowerCase()} rate vs the national benchmark.</p>
                </div>
              )}
            </aside>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Spotlight;
