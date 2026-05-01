import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip, useMap } from "react-leaflet";
import L, { type GeoJSON as LGeoJSON, type LatLngBoundsExpression } from "leaflet";
import { Plus, Minus, RotateCcw } from "lucide-react";

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

interface Props {
  data: SpotlightData;
  onSelect: (f: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, FeatureProps>) => void;
  selectedGeoid: string | null;
}

const colorFor = (flag: FeatureProps["flag"]) => {
  if (flag === "above") return "hsl(1 72% 58%)";
  if (flag === "below") return "hsl(158 70% 37%)";
  return "hsl(220 13% 91%)";
};

// Internal: handles bounds-fit + exposes map to the toolbar via ref callback.
const MapBootstrap = ({
  bounds,
  onReady,
}: {
  bounds: LatLngBoundsExpression | null;
  onReady: (m: L.Map) => void;
}) => {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    if (bounds) map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds, onReady]);
  return null;
};

// Show neighborhood (NAMELSAD) labels only when zoomed in enough (>= 13).
const TractLabels = ({
  features,
}: {
  features: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, FeatureProps>[];
}) => {
  const map = useMap();
  useEffect(() => {
    const layer = L.layerGroup();
    const place = () => {
      layer.clearLayers();
      if (map.getZoom() < 13) return;
      const view = map.getBounds();
      for (const f of features) {
        const c = L.geoJSON(f).getBounds().getCenter();
        if (!view.contains(c)) continue;
        const icon = L.divIcon({
          className: "tract-label",
          html: `<span>${f.properties.NAMELSAD}</span>`,
          iconSize: [100, 14],
        });
        L.marker(c, { icon, interactive: false, keyboard: false }).addTo(layer);
      }
    };
    place();
    layer.addTo(map);
    map.on("zoomend moveend", place);
    return () => {
      map.off("zoomend moveend", place);
      map.removeLayer(layer);
    };
  }, [map, features]);
  return null;
};

export const SpotlightMap = ({ data, onSelect, selectedGeoid }: Props) => {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<LGeoJSON | null>(null);

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    try {
      return L.geoJSON(data.geojson).getBounds();
    } catch {
      return null;
    }
  }, [data.geojson]);

  // Re-style + tooltip when selection or data changes.
  useEffect(() => {
    layerRef.current?.setStyle((feature) => {
      const f = feature as GeoJSON.Feature<GeoJSON.Polygon, FeatureProps>;
      const isSel = f.properties.GEOID === selectedGeoid;
      return {
        fillColor: colorFor(f.properties.flag),
        fillOpacity: f.properties.flag === "none" ? 0.35 : 0.65,
        color: isSel ? "hsl(0 0% 10%)" : "hsl(0 0% 100%)",
        weight: isSel ? 2 : 0.6,
      };
    });
  }, [selectedGeoid, data.geojson]);

  const features = data.geojson.features;

  return (
    <div className="relative w-full h-[560px] rounded-lg overflow-hidden border border-border bg-secondary">
      <MapContainer
        center={data.center}
        zoom={data.zoom}
        scrollWheelZoom
        zoomControl={false}
        className="w-full h-full"
      >
        <MapBootstrap
          bounds={bounds}
          onReady={(m) => {
            mapRef.current = m;
          }}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON
          key={data.metric.id + ":" + data.city}
          data={data.geojson as GeoJSON.GeoJsonObject}
          ref={(r) => {
            if (r) layerRef.current = r as unknown as LGeoJSON;
          }}
          style={(feature) => {
            const f = feature as GeoJSON.Feature<GeoJSON.Polygon, FeatureProps>;
            return {
              fillColor: colorFor(f.properties.flag),
              fillOpacity: f.properties.flag === "none" ? 0.35 : 0.65,
              color: "hsl(0 0% 100%)",
              weight: 0.6,
            };
          }}
          onEachFeature={(feature, layer) => {
            const f = feature as GeoJSON.Feature<GeoJSON.Polygon, FeatureProps>;
            const v = f.properties.value;
            const cmp =
              v == null
                ? "no data available"
                : v > data.metric.benchmark
                ? `${(v - data.metric.benchmark).toFixed(1)} pp above benchmark`
                : `${(data.metric.benchmark - v).toFixed(1)} pp below benchmark`;
            layer.bindTooltip(
              `<div class="font-semibold text-xs">${f.properties.NAMELSAD}</div>
               <div class="text-[11px] text-muted-foreground">${data.metric.label}: ${v == null ? "—" : v.toFixed(1) + "%"}</div>
               <div class="text-[11px]">${cmp}</div>`,
              { sticky: true, className: "tract-tip" },
            );
            layer.on("click", () => onSelect(f));
          }}
        />
        <TractLabels features={features} />
      </MapContainer>

      {/* Legend */}
      <div className="absolute left-3 bottom-3 z-[400] bg-card/95 backdrop-blur rounded-md border border-border shadow-card text-xs px-3 py-2 space-y-1">
        <div className="font-semibold mb-1">Flag Legend</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-destructive" /> Above benchmark (higher risk)</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-primary" /> Below benchmark (lower risk)</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-border" /> No data available</div>
        <div className="text-muted-foreground pt-1 border-t border-border mt-1">National benchmark: <span className="text-foreground font-semibold">{data.metric.benchmark.toFixed(1)}%</span></div>
      </div>

      {/* Zoom toolbar */}
      <div className="absolute right-3 top-3 z-[400] flex flex-col bg-card border border-border rounded-md shadow-card overflow-hidden">
        <button
          aria-label="Zoom in"
          onClick={() => mapRef.current?.zoomIn()}
          className="h-8 w-8 flex items-center justify-center hover:bg-secondary transition-base"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => mapRef.current?.zoomOut()}
          className="h-8 w-8 flex items-center justify-center hover:bg-secondary transition-base border-t border-border"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          aria-label="Reset view"
          onClick={() => {
            if (mapRef.current && bounds) mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }}
          className="h-8 w-8 flex items-center justify-center hover:bg-secondary transition-base border-t border-border"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
