"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, ScaleControl, Source, type LayerProps, type MapProps, type MapRef } from "@vis.gl/react-maplibre";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { AIRPORT_MAP_STYLE, airportTerminalCoordinates } from "@/lib/airport-map";
import { loadAirportGates, type AirportGates } from "@/lib/airport-gates";
import { distanceToTerminal, findAirportTerminal, loadAirportTerminals, type Terminal } from "@/lib/airport-terminals";
import { airportMapSnapshotDate } from "@/lib/airport-map-data";

const footprintFill: LayerProps = { id: "terminal-footprints", type: "fill", paint: { "fill-color": "#e0e0e0", "fill-opacity": 0.8 } };
const footprintEdges: LayerProps = { id: "terminal-walls", type: "line", paint: { "line-color": "#666666", "line-width": 1.5 } };
const activeFill: LayerProps = { id: "active-terminal-fill", type: "fill", paint: { "fill-color": "#999999", "fill-opacity": 0.35 } };
const activeEdges: LayerProps = { id: "active-terminal-walls", type: "line", paint: { "line-color": "#111111", "line-width": 3 } };
const gateDots: LayerProps = {
  id: "airport-gate-doors", type: "circle",
  paint: { "circle-radius": 3.5, "circle-color": "#555555", "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" },
};
const gateLabels: LayerProps = {
  id: "airport-gate-labels", type: "symbol",
  layout: {
    "text-field": ["get", "ref"], "text-font": ["Noto Sans Regular"], "text-size": 13,
    "text-anchor": "bottom", "text-offset": [0, -0.8], "text-padding": 3,
  },
  paint: { "text-color": "#222222", "text-halo-color": "#ffffff", "text-halo-width": 2 },
};
const gateRef = (value: string) => value.trim().toUpperCase().replace(/^GATE\s*/, "").replace(/[\s.-]+/g, "");
const terminalOnlyStyle = {
  version: 8 as const, sources: {},
  layers: [{ id: "background", type: "background" as const, paint: { "background-color": "#f8f8f8" } }],
};

export type AirportGateMapProps = {
  airportCode: string;
  gate: string;
  terminal?: string | null;
  mapStyle?: MapProps["mapStyle"];
  // Access the native MapLibre map for future custom GLSL or vector layers.
  onLoad?: MapProps["onLoad"];
};

export default function AirportGateMap({ airportCode, gate, terminal, mapStyle = AIRPORT_MAP_STYLE, onLoad }: AirportGateMapProps) {
  const code = airportCode.trim().toUpperCase();
  const label = gateRef(gate);
  const terminalLabel = terminal?.trim() || "";
  const coordinates = airportTerminalCoordinates(code);
  if (!coordinates) return <p className="text-sm text-slate-600">Terminal map unavailable for {code || "this airport"}.</p>;
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
  const mapRef = useRef<MapRef>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [gates, setGates] = useState<AirportGates | null>(null);
  const [terminals, setTerminals] = useState<Terminal[] | null>(null);
  const [gateError, setGateError] = useState(false);
  const [terminalError, setTerminalError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [terminalOnly, setTerminalOnly] = useState(false);

  // A slow basemap must not hide bundled/cached terminal geometry indefinitely.
  useEffect(() => {
    if (terminalOnly || mapStatus === "ready") return;
    const timeout = setTimeout(() => setTerminalOnly(true), 4000);
    return () => clearTimeout(timeout);
  }, [terminalOnly, mapStatus]);

  useEffect(() => {
    let active = true;
    void loadAirportGates(code, label).then(data => { if (active) { setGates(data); setGateError(false); } })
      .catch(() => { if (active) setGateError(true); });
    // Load geometry even with a known gate, to draw the physical concourse walls.
    void loadAirportTerminals(code).then(data => { if (active) { setTerminals(data); setTerminalError(false); } })
      .catch(() => { if (active) setTerminalError(true); });
    // Shared requests finish and cache even during React's development remounts.
    return () => { active = false; };
  }, [code, label, attempt]);

  const requestedTerminal = useMemo(() => findAirportTerminal(terminals ?? [], terminalLabel), [terminals, terminalLabel]);
  const matches = useMemo(() => {
    const candidates = gates?.features.filter(feature => gateRef(feature.properties.ref) === label) ?? [];
    if (candidates.length <= 1 || !requestedTerminal) return candidates;
    return candidates.filter(feature => distanceToTerminal(feature.geometry.coordinates, requestedTerminal) <= 40);
  }, [gates, label, requestedTerminal]);
  const selectedGate = matches.length === 1 ? matches[0] : undefined;
  const selectedTerminal = useMemo(() => {
    if (!selectedGate) return requestedTerminal;
    const point = selectedGate.geometry.coordinates;
    if (requestedTerminal && distanceToTerminal(point, requestedTerminal) <= 60) return requestedTerminal;
    const nearest = (terminals ?? []).filter(item => item.geometry.type !== "Point")
      .map(item => ({ item, distance: distanceToTerminal(point, item) })).sort((a, b) => a.distance - b.distance);
    return nearest[0]?.distance <= 60 && (!nearest[1] || nearest[1].distance - nearest[0].distance > 5) ? nearest[0].item : undefined;
  }, [selectedGate, requestedTerminal, terminals]);

  const footprints = useMemo<FeatureCollection>(() => ({ type: "FeatureCollection", features: (terminals ?? []).filter(item => item.geometry.type !== "Point") }), [terminals]);
  const activeFootprint = useMemo<FeatureCollection>(() => ({ type: "FeatureCollection", features: selectedTerminal && selectedTerminal.geometry.type !== "Point" ? [selectedTerminal] : [] }), [selectedTerminal]);
  const initialView = useMemo(() => ({ longitude: coordinates[0], latitude: coordinates[1], zoom: 15.5, pitch: 0, bearing: 0 }), [coordinates]);

  // Fit actual building bounds to this web viewport instead of approximating
  // with one fixed terminal zoom. Keep camera imperative so React cannot reset it.
  const frameLocation = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selectedGate) {
      map.jumpTo({ center: selectedGate.geometry.coordinates as [number, number], zoom: 19, pitch: 0, bearing: 0 });
    } else if (selectedTerminal) {
      const [west, south, east, north] = selectedTerminal.properties.bounds;
      if (west !== east && south !== north) {
        map.fitBounds([[west, south], [east, north]], {
          padding: { top: 68, bottom: 48, left: 32, right: 32 }, maxZoom: 19, duration: 0, bearing: 0,
        });
      } else {
        map.jumpTo({ center: [west, south], zoom: 18, pitch: 0, bearing: 0 });
      }
    } else {
      map.jumpTo({ center: [coordinates[0], coordinates[1]], zoom: 15.5, pitch: 0, bearing: 0 });
    }
  }, [selectedGate, selectedTerminal, coordinates]);
  // Tile/style warnings must not prevent a later successful lookup from
  // recentering an already-created map.
  useEffect(() => { if (mapRef.current) frameLocation(); }, [frameLocation]);

  const terminalName = selectedTerminal?.properties.name || (selectedTerminal?.properties.ref ? `Terminal ${selectedTerminal.properties.ref}` : "Terminal area");
  const title = selectedGate ? `${code} · Gate ${label}` : selectedTerminal ? `${code} · ${terminalName}` : `${code} · Airport overview`;
  const notices: string[] = [];
  if (label && !selectedGate) notices.push(gateError ? "Gate lookup unavailable." : !gates ? `Locating gate ${label}…` : matches.length > 1 ? `Gate ${label} has multiple mapped locations; enter its terminal to narrow the search.` : `Gate ${label} is not mapped here.`);
  if (terminalLabel && !requestedTerminal) notices.push(terminalError ? "Terminal lookup unavailable." : !terminals ? `Locating terminal ${terminalLabel}…` : `Terminal ${terminalLabel} could not be matched; showing ${selectedGate ? "the mapped gate" : "the airport overview"}.`);
  if (selectedGate && requestedTerminal && distanceToTerminal(selectedGate.geometry.coordinates, requestedTerminal) > 60) notices.push("The mapped gate is outside the entered terminal. Check both details with the airline.");
  if (terminalError && !terminalLabel) notices.push("Terminal outlines are currently unavailable.");
  if (gateError && !label) notices.push("Gate labels are currently unavailable.");
  const available = terminals?.map(item => item.properties.ref || item.properties.name).filter(Boolean);
  const fallbackLabels = terminalOnly ? gates?.features.filter(feature => {
    if (feature.id === selectedGate?.id) return false;
    if (selectedGate) {
      const [lon, lat] = feature.geometry.coordinates, [x, y] = selectedGate.geometry.coordinates;
      return Math.hypot((lon - x) * Math.cos(y * Math.PI / 180), lat - y) * 111320 < 150;
    }
    return selectedTerminal && distanceToTerminal(feature.geometry.coordinates, selectedTerminal) < 30;
  }).slice(0, 60) : [];

  return <figure className="space-y-2">
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100 sm:h-[460px]"
      style={{ filter: "grayscale(100%) contrast(115%)" }} role="group" aria-label={title}
      aria-busy={mapStatus === "loading" || Boolean(label && !gates && !gateError) || Boolean(terminalLabel && !terminals && !terminalError)}>
      <Map ref={mapRef} initialViewState={initialView}
        workerUrl={new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()}
        interactive={false} canvasContextAttributes={{ preserveDrawingBuffer: true }} mapStyle={terminalOnly ? terminalOnlyStyle : mapStyle} styleDiffing={!terminalOnly}
        attributionControl={{ compact: false }} style={{ width: "100%", height: "100%" }}
        onLoad={event => { setMapStatus("ready"); frameLocation(); onLoad?.(event); }}
        onStyleData={event => {
          if (terminalOnly && mapStatus !== "ready" && event.target.isStyleLoaded()) { setMapStatus("ready"); frameLocation(); }
        }}
        onResize={frameLocation} onError={() => setMapStatus("error")}>
        <Source id="airport-terminal-footprints" type="geojson" data={footprints} attribution="Terminal outlines © OpenStreetMap contributors">
          <Layer {...footprintFill} /><Layer {...footprintEdges} />
        </Source>
        <Source id="selected-terminal" type="geojson" data={activeFootprint}>
          <Layer {...activeFill} /><Layer {...activeEdges} />
        </Source>
        {gates && <Source id="airport-gates" type="geojson" data={gates} attribution="Gate locations © OpenStreetMap contributors">
          <Layer {...gateDots} />{!terminalOnly && <Layer {...gateLabels} />}
        </Source>}
        {selectedGate && <Marker longitude={selectedGate.geometry.coordinates[0]} latitude={selectedGate.geometry.coordinates[1]} anchor="center">
          <div className="relative h-4 w-4 rounded-full border-[3px] border-white bg-black shadow-[0_0_0_2px_#111]" aria-label={`Mapped gate ${label}`}>
            <span className="absolute bottom-full left-1/2 mb-3 w-max max-w-48 -translate-x-1/2 rounded-md border border-white bg-black px-3 py-2 text-center font-sans text-sm font-bold text-white shadow-lg">Gate {label}</span>
          </div>
        </Marker>}
        {fallbackLabels?.map(feature => <Marker key={feature.id} longitude={feature.geometry.coordinates[0]} latitude={feature.geometry.coordinates[1]} anchor="bottom" offset={[0, -7]}>
          <span className="rounded bg-white/90 px-1 font-sans text-[11px] font-semibold text-slate-800">{feature.properties.ref}</span>
        </Marker>)}
        <ScaleControl position="bottom-left" unit="metric" />
      </Map>
      <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
        <p className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm font-bold text-slate-950 shadow-sm">{title}</p>
        <button type="button" onClick={frameLocation} className="pointer-events-auto rounded-lg border border-slate-300 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm">Recenter</button>
      </div>
      {mapStatus !== "ready" && <p role="status" className="pointer-events-none absolute bottom-12 left-3 right-3 rounded-lg bg-white/95 p-2 text-sm text-slate-700">
        {mapStatus === "loading" ? "Loading terminal map…" : "Some map data could not load. Check your connection."}
      </p>}
    </div>
    {notices.length > 0 && <p role="status" className="text-xs text-slate-600">{notices.join(" ")}</p>}
    {(gateError || terminalError) && <button type="button" onClick={() => setAttempt(value => value + 1)} className="text-xs font-semibold text-sky-800 underline">Retry map lookup (allow a minute after a service failure)</button>}
    {terminalLabel && terminals && !requestedTerminal && Boolean(available?.length) && <p className="text-xs text-slate-600">Mapped terminals: {[...new Set(available)].join(", ")}.</p>}
    <figcaption className="text-xs text-slate-600">
      {selectedGate ? "Pin marks the OpenStreetMap gate position; surrounding gate doors and terminal walls provide context."
        : selectedTerminal ? selectedTerminal.geometry.type === "Point" ? "Centered on the mapped terminal label. A building outline is unavailable; this does not identify an assigned gate."
          : "Outlined building is the selected terminal. The view fits its mapped footprint; this does not identify an assigned gate."
          : "Airport overview. Enter a terminal or gate above for a specific view."}
      {" "}Interior room detail depends on map coverage. Confirm current terminal and gate assignments with the airline.
      {airportMapSnapshotDate(code) && ` Terminal-area map data: OpenStreetMap snapshot, ${airportMapSnapshotDate(code)}. Coverage is limited to the bundled terminal areas.`}
      {terminalOnly && " Simplified terminal view; the street basemap could not load."}
    </figcaption>
  </figure>;
}
