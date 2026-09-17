"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MlMap, Marker, NavigationControl, type ErrorEvent, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapField {
  id: string;
  name: string;
  center_lat: number | null;
  center_lng: number | null;
  polygon: GeoJSON.Geometry | null;
}

/** Default view: the demo farm (Story County, Iowa) — never San Francisco. */
const FARM_CENTER: [number, number] = [-93.632, 41.9795];

/** Fallback street tiles if the satellite provider is blocked. */
const OSM_TILES = [
  "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
];

/**
 * Satellite field map (MapLibre + Esri World Imagery, no API key).
 * Polygons come from PostGIS (`v_fields_map.polygon`); selected field is highlighted.
 *
 * Resilience notes: our polygons/pins must render even when tile fetches are
 * slow or blocked (ad-blocker, firewall, offline). So the map is created in the
 * ref callback (deterministic, no state round-trip), field data is pushed
 * immediately + on `load` + on a timer, and repeated satellite tile errors flip
 * to street tiles automatically. A backdrop layer paints farmland green underneath.
 */
export default function FieldMap({
  fields = [],
  selectedId,
  onSelect,
}: {
  fields?: MapField[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const mapRef = useRef<MlMap | null>(null);
  const [mapReady, setMapReady] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const pushedRef = useRef<string>("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map the moment its container mounts (ref callback, not an effect).
  const attach = useCallback((el: HTMLDivElement | null) => {
    if (!el) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }
    if (mapRef.current) return;
    let map: MlMap;
    try {
      map = new MlMap({
        container: el,
        style: {
          version: 8,
          sources: {
            esri: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256
            },
            osm: {
              type: "raster",
              tiles: OSM_TILES,
              tileSize: 256,
              attribution: "© OpenStreetMap contributors © CARTO",
            },
            fields: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
          },
          layers: [
            { id: "backdrop", type: "background", paint: { "background-color": "#2c3a26" } },
            { id: "sat-esri", type: "raster", source: "esri" },
            { id: "sat-osm", type: "raster", source: "osm", layout: { visibility: "none" } },
            {
              id: "field-fill",
              type: "fill",
              source: "fields",
              paint: {
                "fill-color": ["case", ["==", ["get", "id"], ["get", "selected"]], "#3b82f6", "#c98f4e"],
                "fill-opacity": ["case", ["==", ["get", "id"], ["get", "selected"]], 0.45, 0.4],
              },
            },
            {
              id: "field-line",
              type: "line",
              source: "fields",
              paint: {
                "line-color": ["case", ["==", ["get", "id"], ["get", "selected"]], "#3b82f6", "#ffffff"],
                "line-width": 1.5,
                "line-dasharray": [2, 1],
              },
            },
          ],
        },
        center: FARM_CENTER,
        zoom: 14,
      });
    } catch (err) {
      setMapError(err instanceof Error ? err.message : "Map failed to start (WebGL unavailable?)");
      return;
    }
    map.addControl(new NavigationControl(), "top-right");
    // If satellite tiles are blocked, fall back to street tiles after a few failures.
    let esriErrors = 0;
    let fellBack = false;
    map.on("error", (e: ErrorEvent & { sourceId?: string }) => {
      if (fellBack || e?.sourceId !== "esri") return;
      esriErrors += 1;
      if (esriErrors >= 4) {
        fellBack = true;
        try {
          map.setLayoutProperty("sat-esri", "visibility", "none");
          map.setLayoutProperty("sat-osm", "visibility", "visible");
        } catch {
          /* style gone — backdrop + polygons still render */
        }
      }
    });
    map.on("click", "field-fill", (e: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      const f = e.features?.[0]?.properties;
      if (typeof f?.id === "string") onSelectRef.current?.(f.id);
    });
    map.on("mouseenter", "field-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "field-fill", () => {
      map.getCanvas().style.cursor = "";
    });
    mapRef.current = map;
    setMapReady((n) => n + 1);
  }, []);

  // Push field polygons + fit bounds when data/selection changes.
  // Not gated on tile loading: runs now, on `load`, and on a timer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapReady === 0) return;
    const key = JSON.stringify([fields.map((f) => f.id), selectedId]);
    const features: GeoJSON.Feature[] = [];
    const pts: Array<[number, number]> = [];
    for (const f of fields) {
      if (f.polygon) {
        features.push({
          type: "Feature",
          properties: { id: f.id, name: f.name },
          geometry: f.polygon,
        });
        const ring =
          f.polygon.type === "Polygon"
            ? f.polygon.coordinates[0]
            : f.polygon.type === "MultiPolygon"
              ? f.polygon.coordinates.flat(1)
              : [];
        for (const c of ring as number[][]) {
          pts.push([c[0], c[1]]);
        }
      } else if (f.center_lng != null && f.center_lat != null) {
        pts.push([f.center_lng, f.center_lat]);
      }
    }
    const push = () => {
      if (pushedRef.current === key) return;
      try {
        const src = map.getSource("fields") as GeoJSONSource | undefined;
        if (!src) return; // style not parsed yet — load handler / timer will retry
        pushedRef.current = key;
        // Encode selection per-feature so the style expression can highlight it.
        src.setData({
          type: "FeatureCollection",
          features: features.map((ft) => ({
            ...ft,
            properties: {
              ...((ft.properties as Record<string, unknown>) ?? {}),
              selected: selectedId ?? null,
            },
          })),
        });
      } catch {
        return; // style not ready — load handler / timer will retry
      }
      if (pts.length > 0) {
        try {
          map.fitBounds(
            [
              [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))],
              [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))],
            ],
            { padding: 40, maxZoom: 16 }
          );
        } catch {
          /* camera not ready — harmless */
        }
      }
    };
    push();
    map.once("load", push);
    const t = setTimeout(push, 3000);
    return () => clearTimeout(t);
  }, [mapReady, fields, selectedId]);

  // Center pins are rendered as HTML markers (avoids symbol/glyph dependencies).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapReady === 0) return;
    const markers: Marker[] = [];
    const add = () => {
      for (const m of markers) m.remove();
      markers.length = 0;
      for (const f of fields) {
        if (f.center_lng == null || f.center_lat == null) continue;
        const el = document.createElement("button");
        el.title = f.name;
        el.style.cssText = `width:${f.id === selectedId ? 18 : 12}px;height:${f.id === selectedId ? 18 : 12}px;border-radius:9999px;background:${f.id === selectedId ? "#3b82f6" : "#2f9df0"};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer`;
        el.onclick = () => onSelectRef.current?.(f.id);
        markers.push(new Marker({ element: el }).setLngLat([f.center_lng, f.center_lat]).addTo(map));
      }
    };
    add();
    map.once("load", add);
    const t = setTimeout(add, 3000);
    return () => {
      clearTimeout(t);
      for (const m of markers) m.remove();
    };
  }, [mapReady, fields, selectedId]);

  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-xl border border-[#ececec] bg-[#2c3a26]">
      <div ref={attach} className="absolute inset-0" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      {fields.length === 0 && !mapError && (
        <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-3 py-1 text-[12px] text-white">
          Loading field boundary…
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] text-[#cfcfcf]">
          Map unavailable: {mapError}
        </div>
      )}
    </div>
  );
}
