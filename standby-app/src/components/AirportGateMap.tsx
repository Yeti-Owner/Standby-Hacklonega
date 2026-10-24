"use client";

import { useEffect, useState } from "react";
import Map, { Layer, Marker, Source, type LayerProps, type MapProps } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { AIRPORT_MAP_STYLE, airportTerminalCoordinates } from "@/lib/airport-map";
import { loadAirportGates, type AirportGates } from "@/lib/airport-gates";
import { locateAirportTerminal } from "@/lib/airport-terminals";

const gateDots: LayerProps = {
  id: "airport-gate-doors",
  type: "circle",
  paint: { "circle-radius": 3, "circle-color": "#666666", "circle-stroke-width": 1, "circle-stroke-color": "#ffffff" },
};
const gateLabels: LayerProps = {
  id: "airport-gate-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "ref"],
    "text-font": ["Noto Sans Regular"],
    "text-size": 12,
    "text-anchor": "bottom",
    "text-offset": [0, -0.7],
    "text-allow-overlap": true,
  },
  paint: { "text-color": "#333333", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
};

export type AirportGateMapProps = {
  airportCode: string;
  gate: string;
  terminal?: string | null;
  // Keep vector styling and the native MapLibre map accessible for future
  // custom layers, building extrusions, or GLSL rendering via event.target.
  mapStyle?: MapProps["mapStyle"];
  onLoad?: MapProps["onLoad"];
};

export default function AirportGateMap({ airportCode, gate, terminal, mapStyle = AIRPORT_MAP_STYLE, onLoad }: AirportGateMapProps) {
  const code = airportCode.trim().toUpperCase();
  const label = gate.trim().toUpperCase();
  const terminalLabel = terminal?.trim() || "";
  const coordinates = airportTerminalCoordinates(code);

  if (!coordinates) return <p className="text-sm text-slate-600">Terminal map unavailable for {code || "this airport"}.{label && ` Gate ${label}.`}</p>;

  // Reset immediately on flight changes; never show a previous flight's gate.
  return <TerminalMap key={`${code}_${label}_${terminalLabel}`} {...{ code, label, terminalLabel, coordinates, mapStyle, onLoad }} />;
}

function TerminalMap({ code, label, terminalLabel, coordinates, mapStyle, onLoad }: {
  code: string;
  label: string;
  terminalLabel: string;
  coordinates: readonly [number, number];
  mapStyle: MapProps["mapStyle"];
  onLoad: MapProps["onLoad"];
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [gates, setGates] = useState<AirportGates | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [terminalCenter, setTerminalCenter] = useState<{ longitude: number; latitude: number } | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<"loading" | "found" | "unavailable">("loading");

  useEffect(() => {
    if (label || !terminalLabel) return;
    let active = true;
    void locateAirportTerminal(code, terminalLabel, coordinates).then(center => {
      if (active) { setTerminalCenter(center ?? null); setTerminalStatus(center ? "found" : "unavailable"); }
    }).catch(() => { if (active) setTerminalStatus("unavailable"); });
    return () => { active = false; };
  }, [code, label, terminalLabel, coordinates]);

  useEffect(() => {
    let active = true;
    void loadAirportGates(code, label, coordinates).then(data => {
      if (active) setGates(data);
    }).catch(() => { if (active) setLookupFailed(true); });
    // Let the shared request finish and cache even if this component unmounts.
    return () => { active = false; };
  }, [code, label, coordinates]);

  const matches = gates?.features.filter(feature => feature.properties.ref.toUpperCase() === label) ?? [];
  const selected = matches.length === 1 ? matches[0] : undefined;

  const [longitude, latitude] = selected?.geometry.coordinates ?? (terminalCenter ? [terminalCenter.longitude, terminalCenter.latitude] : coordinates);

  return (
    <figure className="space-y-2">
      <div
        className="relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
        style={{ filter: "grayscale(100%) contrast(115%)" }}
        role="group"
        aria-label={selected ? `${code} terminal map centered on mapped gate ${label}` : `${code} terminal overview`}
        aria-busy={status === "loading"}
      >
        <Map
          // Let Next.js emit MapLibre's module worker as a local, versioned asset.
          workerUrl={new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()}
          longitude={longitude}
          latitude={latitude}
          zoom={selected ? 18 : terminalCenter ? 17 : 16}
          bearing={0}
          pitch={0}
          interactive={false}
          canvasContextAttributes={{ preserveDrawingBuffer: true }}
          mapStyle={mapStyle}
          attributionControl={{ compact: false }}
          style={{ width: "100%", height: "100%" }}
          onLoad={event => { setStatus("ready"); onLoad?.(event); }}
          onError={() => setStatus("error")}
        >
          {gates && (
            <Source id="airport-gates" type="geojson" data={gates} attribution="Gate locations © OpenStreetMap contributors">
              <Layer {...gateDots} />
              <Layer {...gateLabels} />
            </Source>
          )}
          {selected && (
            <Marker longitude={longitude} latitude={latitude} anchor="bottom">
              <div className="flex flex-col items-center" aria-label={`Gate ${label}`}>
                <span className="max-w-48 break-words rounded-md border border-white bg-slate-900 px-3 py-1.5 text-center font-sans text-sm font-bold text-white shadow-md">{label}</span>
                <span className="h-3 w-3 -translate-y-1.5 rotate-45 bg-slate-900" />
              </div>
            </Marker>
          )}
        </Map>
      </div>
    </figure>
  );
}
