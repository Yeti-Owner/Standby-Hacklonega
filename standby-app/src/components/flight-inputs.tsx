"use client";

import { useState } from "react";
import ConciergePanel from "@/components/concierge-panel";
import type { FlightResult } from "@/lib/concierge";
import { Airport, AIRPORTS } from "@/lib/airports";
import { Calendar, Clock, Plane, ArrowRight, ArrowLeftRight, MapPin, Route } from "lucide-react";

interface FlightInputsProps {
  onResolved: (result: FlightResult) => void;
  onResult: (result: FlightResult | null) => void;
  originAirport: Airport;
  onSelectOrigin: (airport: Airport) => void;
  destinationAirport: Airport;
  onSelectDestination: (airport: Airport) => void;
  layoverCount: 0 | 1 | 2;
  onChangeLayoverCount: (count: 0 | 1 | 2) => void;
  layoverAirport1: Airport;
  onSelectLayover1: (airport: Airport) => void;
  layoverAirport2: Airport | null;
  onSelectLayover2: (airport: Airport | null) => void;
}

export default function FlightInputs({
  onResolved,
  onResult,
  originAirport,
  onSelectOrigin,
  destinationAirport,
  onSelectDestination,
  layoverCount,
  onChangeLayoverCount,
  layoverAirport1,
  onSelectLayover1,
  layoverAirport2,
  onSelectLayover2,
}: FlightInputsProps) {
  const [arrivalDate, setArrivalDate] = useState(() => {
    const date = new Date(); date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  const [arrivalHour, setArrivalHour] = useState("19:00");

  const handleSwapAirports = () => {
    const tempOrigin = originAirport;
    onSelectOrigin(destinationAirport);
    onSelectDestination(tempOrigin);
  };

  const popularHubs = [
    "ATL", "JFK", "ORD", "LAX", "LHR", "CDG", "FRA", "DXB", "HND", "SIN", "ZRH", "DFW"
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      {/* Box 1: Flight Route & Schedule */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-sky-100 p-6 md:p-7 shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-sky-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Flight Route & Schedule
              </h3>
              <p className="text-xs text-slate-500">
                Origin, destination, and layover waypoint parameters
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold tracking-wider font-mono">
            {originAirport.iata} ➔ {destinationAirport.iata}
          </span>
        </div>

        {/* Origin (From) & Destination (To) Selector */}
        <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 items-center">
            {/* Origin (Where flight is from) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-600" />
                Flight From (Origin)
              </label>
              <select
                aria-label="Select Departure Airport"
                value={originAirport.iata}
                onChange={(e) => {
                  const found = AIRPORTS.find((a) => a.iata === e.target.value);
                  if (found) onSelectOrigin(found);
                }}
                className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-slate-900"
              >
                {!AIRPORTS.some(a => a.iata === originAirport.iata) && <option value={originAirport.iata}>{originAirport.city} ({originAirport.iata})</option>}
                {AIRPORTS.map((a) => (
                  <option key={`origin-${a.iata}`} value={a.iata}>
                    {a.city} ({a.iata})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center pt-3 sm:pt-4">
              <button
                type="button"
                onClick={handleSwapAirports}
                className="p-2 rounded-full bg-white hover:bg-sky-50 border border-slate-200 text-slate-600 hover:text-sky-600 transition-colors cursor-pointer shadow-xs"
                title="Swap Origin and Destination"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Destination (Where it has to go) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Plane className="w-3 h-3 text-amber-500" />
                Flight To (Destination)
              </label>
              <select
                aria-label="Select Destination Airport"
                value={destinationAirport.iata}
                onChange={(e) => {
                  const found = AIRPORTS.find((a) => a.iata === e.target.value);
                  if (found) onSelectDestination(found);
                }}
                className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-slate-900"
              >
                {!AIRPORTS.some(a => a.iata === destinationAirport.iata) && <option value={destinationAirport.iata}>{destinationAirport.city} ({destinationAirport.iata})</option>}
                {AIRPORTS.map((a) => (
                  <option key={`dest-${a.iata}`} value={a.iata}>
                    {a.city} ({a.iata})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Layover Count Selector */}
          <div className="pt-2 border-t border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Layovers & Stops
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onChangeLayoverCount(0)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                  layoverCount === 0
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Direct (0 Stops)
              </button>
              <button
                type="button"
                onClick={() => onChangeLayoverCount(1)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                  layoverCount === 1
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                1 Layover
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeLayoverCount(2);
                  if (!layoverAirport2) {
                    const fallback = AIRPORTS.find((a) => a.iata === "DXB") || AIRPORTS[6];
                    onSelectLayover2(fallback);
                  }
                }}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                  layoverCount === 2
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                2 Layovers
              </button>
            </div>

            {/* Layover 1 Selection */}
            {layoverCount >= 1 && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Layover Station 1:
                  </label>
                  <span className="text-[11px] font-mono font-bold text-sky-800">
                    {layoverAirport1.name} ({layoverAirport1.iata})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {popularHubs.slice(3, 11).map((hubIata) => (
                    <button
                      key={`hub-1-${hubIata}`}
                      type="button"
                      onClick={() => {
                        const airport = AIRPORTS.find((a) => a.iata === hubIata);
                        if (airport) onSelectLayover1(airport);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        layoverAirport1.iata === hubIata
                          ? "bg-amber-500 text-white font-bold"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {hubIata}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Layover 2 Selection */}
            {layoverCount === 2 && (
              <div className="mt-2.5 p-3 bg-white rounded-lg border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Layover Station 2:
                  </label>
                  <span className="text-[11px] font-mono font-bold text-sky-800">
                    {layoverAirport2 ? `${layoverAirport2.name} (${layoverAirport2.iata})` : "Select Hub"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {popularHubs.slice(5, 12).map((hubIata) => (
                    <button
                      key={`hub-2-${hubIata}`}
                      type="button"
                      onClick={() => {
                        const airport = AIRPORTS.find((a) => a.iata === hubIata);
                        if (airport) onSelectLayover2(airport);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        layoverAirport2?.iata === hubIata
                          ? "bg-indigo-600 text-white font-bold"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {hubIata}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Route Breadcrumb Banner */}
            <div className="mt-3 px-3 py-2 bg-sky-50/80 rounded-lg border border-sky-200/70 flex items-center justify-between text-xs">
              <span className="font-bold text-sky-950 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-sky-600" />
                Active Route:
              </span>
              <div className="font-mono font-bold text-sky-900 flex items-center gap-1">
                <span>{originAirport.iata}</span>
                <ArrowRight className="w-3 h-3 text-sky-400" />
                {layoverCount >= 1 && (
                  <>
                    <span className="text-amber-700">{layoverAirport1.iata}</span>
                    <ArrowRight className="w-3 h-3 text-sky-400" />
                  </>
                )}
                {layoverCount === 2 && layoverAirport2 && (
                  <>
                    <span className="text-indigo-700">{layoverAirport2.iata}</span>
                    <ArrowRight className="w-3 h-3 text-sky-400" />
                  </>
                )}
                <span>{destinationAirport.iata}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Inputs: Date, Time, Aircraft */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date of Arrival */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              Departure date
            </label>
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-medium text-slate-900 transition-colors"
            />
          </div>

          {/* Departure time (origin local) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Departure time (origin local)
            </label>
            <input
              type="time"
              value={arrivalHour}
              onChange={(e) => setArrivalHour(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-medium text-slate-900 transition-colors"
            />
          </div>

        </div>
        <p className="mt-3 text-xs text-slate-600">Times are local to the departure airport. Map layovers are planning waypoints; analysis searches the direct origin–destination leg.</p>
      </div>
      <ConciergePanel
        onResult={onResult}
        routeRequest={`From ${originAirport.iata} to ${destinationAirport.iata} on ${arrivalDate} at ${arrivalHour}`}
        onResolved={result => {
          const scheduled = result.selected_flight?.scheduled_departure;
          if (scheduled) { setArrivalDate(scheduled.slice(0, 10)); setArrivalHour(scheduled.slice(11, 16)); }
          onResolved(result);
        }}
      />
    </div>
  );
}
