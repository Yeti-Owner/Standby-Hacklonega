"use client";

import { useState } from "react";
import Map, { Marker, type MapProps } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { AIRPORT_MAP_STYLE, airportTerminalCoordinates } from "@/lib/airport-map";

export type AirportGateMapProps = {
  airportCode: string;
  gate: string;
  // Keep vector styling and the native MapLibre map accessible for future
  // custom layers, building extrusions, or GLSL rendering via event.target.
  mapStyle?: MapProps["mapStyle"];
  onLoad?: MapProps["onLoad"];
};

export default function AirportGateMap({ airportCode, gate, mapStyle = AIRPORT_MAP_STYLE, onLoad }: AirportGateMapProps) {
  const code = airportCode.trim().toUpperCase();
  const label = gate.trim();
  const coordinates = airportTerminalCoordinates(code);

  if (!label) return <p className="text-sm text-slate-600">Gate not assigned yet.</p>;
  if (!coordinates) return <p className="text-sm text-slate-600">Terminal map unavailable for {code || "this airport"}. Gate {label}.</p>;

  // Remount on airport changes so camera and loading state cannot retain an old airport.
  return <TerminalMap key={code} {...{ code, label, coordinates, mapStyle, onLoad }} />;
}

function TerminalMap({ code, label, coordinates: [longitude, latitude], mapStyle, onLoad }: {
  code: string;
  label: string;
  coordinates: readonly [number, number];
  mapStyle: MapProps["mapStyle"];
  onLoad: MapProps["onLoad"];
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  return <figure className="space-y-2">
    <div
      className="relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      style={{ filter: "grayscale(100%) contrast(105%)" }}
      role="group"
      aria-label={`${code} terminal overview, gate ${label}. Marker is at the airport center, not the exact gate.`}
      aria-busy={status === "loading"}
    >
      <Map
        // Let Next.js emit MapLibre's module worker as a local, versioned asset.
        workerUrl={new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()}
        longitude={longitude}
        latitude={latitude}
        zoom={16}
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
        <Marker longitude={longitude} latitude={latitude} anchor="bottom">
          <div className="flex flex-col items-center" aria-label={`Gate ${label}`}>
            <span className="max-w-48 break-words rounded-md border border-white bg-slate-900 px-3 py-1.5 text-center font-sans text-sm font-bold text-white shadow-md">{label}</span>
            <span className="h-3 w-3 -translate-y-1.5 rotate-45 bg-slate-900" />
          </div>
        </Marker>
      </Map>
      {status !== "ready" && <p role="status" className="pointer-events-none absolute left-3 right-3 top-3 rounded-md bg-white/95 p-2 text-sm text-slate-700">
        {status === "loading" ? "Loading terminal map…" : `Map unavailable. ${code} · Gate ${label}. Check the airport signs for directions.`}
      </p>}
    </div>
    <figcaption className="text-xs text-slate-600">Airport overview · Gate {label}. Pin marks the airport center, not the exact gate. Labels depend on map coverage; confirm your gate with the airline.</figcaption>
  </figure>;
}
