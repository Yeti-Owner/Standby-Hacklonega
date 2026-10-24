"use client";

import { useState, useEffect } from "react";
import { Airport, AIRPORTS } from "@/lib/airports";
import {
  Calendar,
  Clock,
  Plane,
  CloudRain,
  Thermometer,
  Wind,
  Gauge,
  Droplets,
  RefreshCw,
  ArrowRight,
  ArrowLeftRight,
  MapPin,
  Route,
} from "lucide-react";

interface FlightInputsProps {
  selectedAirport: Airport | null;
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
  selectedAirport,
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
  // Flight Arrival Telemetry State
  const [arrivalDate, setArrivalDate] = useState("2026-10-25");
  const [arrivalHour, setArrivalHour] = useState("14:30");
  const [aircraftCode, setAircraftCode] = useState("B77W");

  useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    setArrivalDate(today.toISOString().split("T")[0]);
  }, []);

  // Weather Telemetry State (Pre-filled with airport defaults, fully editable, ready for API sync)
  const activeAirport = destinationAirport || selectedAirport;
  const [temp, setTemp] = useState(activeAirport ? activeAirport.defaultTemp : 20);
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [humidity, setHumidity] = useState(activeAirport ? activeAirport.defaultHumidity : 60);
  const [precipitation, setPrecipitation] = useState("0.0 mm (Nil)");
  const [windDir, setWindDir] = useState(activeAirport ? activeAirport.defaultWindDir : 280);
  const [windSpeed, setWindSpeed] = useState(activeAirport ? activeAirport.defaultWindKts : 10);
  const [pressure, setPressure] = useState(activeAirport ? activeAirport.defaultPressure : 1013);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update weather whenever selected destination airport changes
  useEffect(() => {
    if (activeAirport) {
      setTemp(activeAirport.defaultTemp);
      setHumidity(activeAirport.defaultHumidity);
      setWindDir(activeAirport.defaultWindDir);
      setWindSpeed(activeAirport.defaultWindKts);
      setPressure(activeAirport.defaultPressure);
    }
  }, [activeAirport]);

  const simulateWeatherSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      if (activeAirport) {
        const variance = (Math.random() - 0.5) * 3;
        setTemp(Math.round(activeAirport.defaultTemp + variance));
        setWindSpeed(Math.max(2, Math.round(activeAirport.defaultWindKts + variance)));
        setHumidity(Math.min(98, Math.max(20, Math.round(activeAirport.defaultHumidity + variance * 2))));
      }
      setIsSyncing(false);
    }, 600);
  };

  const handleSwapAirports = () => {
    const tempOrigin = originAirport;
    onSelectOrigin(destinationAirport);
    onSelectDestination(tempOrigin);
  };

  const commonAircraft = [
    { code: "B77W", label: "B77W (Boeing 777-300ER)" },
    { code: "A359", label: "A359 (Airbus A350-900)" },
    { code: "B789", label: "B789 (Boeing 787-9 Dreamliner)" },
    { code: "A321", label: "A321 (Airbus A321neo)" },
    { code: "B738", label: "B738 (Boeing 737-800)" },
    { code: "CRJ9", label: "CRJ9 (Bombardier CRJ-900)" },
  ];

  const popularHubs = [
    "ATL", "JFK", "ORD", "LAX", "LHR", "CDG", "FRA", "DXB", "HND", "SIN", "ZRH", "DFW"
  ];

  const displayTemp = tempUnit === "C" ? `${temp}°C` : `${Math.round((temp * 9) / 5 + 32)}°F`;

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
              Date of Flight
            </label>
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-medium text-slate-900 transition-colors"
            />
          </div>

          {/* Arrival Hour & Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Arrival Hour & Time
            </label>
            <input
              type="time"
              value={arrivalHour}
              onChange={(e) => setArrivalHour(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-medium text-slate-900 transition-colors"
            />
          </div>

          {/* Aircraft Code */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-sky-600" />
                Aircraft Code (IATA / ICAO)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Standard equipment
              </span>
            </label>

            <div className="flex gap-2">
              <select
                value={aircraftCode}
                onChange={(e) => setAircraftCode(e.target.value)}
                aria-label="Select Aircraft Code"
                className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-medium text-slate-900 transition-colors"
              >
                {commonAircraft.map((craft) => (
                  <option key={craft.code} value={craft.code}>
                    {craft.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Custom (e.g. A388)"
                aria-label="Custom Aircraft Code"
                value={aircraftCode}
                onChange={(e) => setAircraftCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-28 px-3 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-center font-bold text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Box 2: Weather & Meteorological Telemetry for Destination */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-sky-100 p-6 md:p-7 shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-sky-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Weather & Atmospheric Input
              </h3>
              <p className="text-xs text-slate-500">
                Synchronized with meteorological forecast for {destinationAirport.iata}
              </p>
            </div>
          </div>

          <button
            onClick={simulateWeatherSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh weather data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-sky-600" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {/* Temperature */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                Temp
              </span>
              <button
                onClick={() => setTempUnit(tempUnit === "C" ? "F" : "C")}
                className="text-[10px] font-bold text-sky-700 hover:underline cursor-pointer"
              >
                °{tempUnit === "C" ? "F" : "C"}
              </button>
            </div>
            <input
              type="number"
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
              className="text-lg font-bold text-slate-900 w-full bg-transparent focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 block">{displayTemp}</span>
          </div>

          {/* Humidity */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              Humidity
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={humidity}
                min={0}
                max={100}
                onChange={(e) => setHumidity(Number(e.target.value))}
                className="text-lg font-bold text-slate-900 w-14 bg-transparent focus:outline-none"
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Relative</span>
          </div>

          {/* Precipitation */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <CloudRain className="w-3.5 h-3.5 text-blue-500" />
              Precip.
            </span>
            <input
              type="text"
              value={precipitation}
              onChange={(e) => setPrecipitation(e.target.value)}
              className="text-sm font-bold text-slate-900 w-full bg-transparent focus:outline-none truncate"
            />
            <span className="text-[10px] text-slate-400 block">Runway state</span>
          </div>

          {/* Wind Direction */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <Wind className="w-3.5 h-3.5 text-teal-500" />
              Wind Dir
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={windDir}
                min={0}
                max={360}
                onChange={(e) => setWindDir(Number(e.target.value))}
                className="text-lg font-bold text-slate-900 w-14 bg-transparent focus:outline-none"
              />
              <span className="text-sm font-semibold text-slate-500">°</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Magnetic heading</span>
          </div>

          {/* Wind Speed */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <Wind className="w-3.5 h-3.5 text-indigo-500" />
              Speed
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={windSpeed}
                min={0}
                max={150}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="text-lg font-bold text-slate-900 w-14 bg-transparent focus:outline-none"
              />
              <span className="text-sm font-semibold text-slate-500">kts</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Ground velocity</span>
          </div>

          {/* Pressure / QNH */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <Gauge className="w-3.5 h-3.5 text-amber-500" />
              QNH Press.
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={pressure}
                min={900}
                max={1080}
                onChange={(e) => setPressure(Number(e.target.value))}
                className="text-lg font-bold text-slate-900 w-14 bg-transparent focus:outline-none"
              />
              <span className="text-xs font-semibold text-slate-500">hPa</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Barometric</span>
          </div>
        </div>
      </div>
    </div>
  );
}
