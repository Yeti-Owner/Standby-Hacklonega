"use client";

import { useState, useEffect } from "react";
import { Airport } from "@/lib/airports";
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
  CheckCircle2,
  Info,
} from "lucide-react";

interface FlightInputsProps {
  selectedAirport: Airport | null;
}

export default function FlightInputs({ selectedAirport }: FlightInputsProps) {
  // Flight Arrival Telemetry State
  const [arrivalDate, setArrivalDate] = useState("2026-10-25");
  const [arrivalHour, setArrivalHour] = useState("14:30");
  const [aircraftCode, setAircraftCode] = useState("B77W");
  const [standbyPriority, setStandbyPriority] = useState("Priority Alpha");

  useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    setArrivalDate(today.toISOString().split("T")[0]);
  }, []);

  // Weather Telemetry State (Pre-filled with airport defaults, fully editable, ready for API sync)
  const [temp, setTemp] = useState(selectedAirport ? selectedAirport.defaultTemp : 20);
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [humidity, setHumidity] = useState(selectedAirport ? selectedAirport.defaultHumidity : 60);
  const [precipitation, setPrecipitation] = useState("0.0 mm (Nil)");
  const [windDir, setWindDir] = useState(selectedAirport ? selectedAirport.defaultWindDir : 280);
  const [windSpeed, setWindSpeed] = useState(selectedAirport ? selectedAirport.defaultWindKts : 10);
  const [pressure, setPressure] = useState(selectedAirport ? selectedAirport.defaultPressure : 1013);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Cached METAR");

  // Update weather whenever selected airport changes
  useEffect(() => {
    if (selectedAirport) {
      setTemp(selectedAirport.defaultTemp);
      setHumidity(selectedAirport.defaultHumidity);
      setWindDir(selectedAirport.defaultWindDir);
      setWindSpeed(selectedAirport.defaultWindKts);
      setPressure(selectedAirport.defaultPressure);
      setLastSyncTime("Synced for " + selectedAirport.iata);
    }
  }, [selectedAirport]);

  const simulateWeatherSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      if (selectedAirport) {
        // Subtle realistic variance
        const variance = (Math.random() - 0.5) * 3;
        setTemp(Math.round(selectedAirport.defaultTemp + variance));
        setWindSpeed(Math.max(2, Math.round(selectedAirport.defaultWindKts + variance)));
        setHumidity(Math.min(98, Math.max(20, Math.round(selectedAirport.defaultHumidity + variance * 2))));
      }
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setIsSyncing(false);
    }, 600);
  };

  const commonAircraft = [
    { code: "B77W", label: "B77W (Boeing 777-300ER)" },
    { code: "A359", label: "A359 (Airbus A350-900)" },
    { code: "B789", label: "B789 (Boeing 787-9 Dreamliner)" },
    { code: "A321", label: "A321 (Airbus A321neo)" },
    { code: "B738", label: "B738 (Boeing 737-800)" },
    { code: "CRJ9", label: "CRJ9 (Bombardier CRJ-900)" },
  ];

  const displayTemp = tempUnit === "C" ? `${temp}°C` : `${Math.round((temp * 9) / 5 + 32)}°F`;

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      {/* Box 1: Flight Arrival Parameters */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-sky-100 p-6 md:p-7 shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-sky-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Flight Schedule & Arrival
              </h3>
              <p className="text-xs text-slate-500">
                Destination waypoint & operational schedule
              </p>
            </div>
          </div>

          {selectedAirport && (
            <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold tracking-wider font-mono">
              {selectedAirport.iata}
            </span>
          )}
        </div>

        {/* Airport Status Banner */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Arrival Station
            </span>
            <span className="text-sm font-bold text-slate-900">
              {selectedAirport
                ? `${selectedAirport.name} (${selectedAirport.iata})`
                : "No airport selected — using Hartsfield-Jackson (ATL)"}
            </span>
            {selectedAirport && (
              <span className="text-xs text-slate-500 block">
                {selectedAirport.city}, {selectedAirport.country} • Elev. {selectedAirport.elevationFt} ft
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date of Arrival */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              Date of Arrival
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
                placeholder="Or custom (e.g. A388)"
                aria-label="Custom Aircraft Code"
                value={aircraftCode}
                onChange={(e) => setAircraftCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-28 px-3 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-center font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Standby clearance badge */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Flight Slot Monitored
          </div>
          <span className="font-mono text-slate-400 text-[11px]">
            Standby Mode: Active
          </span>
        </div>
      </div>

      {/* Box 2: Weather & Meteorological Telemetry */}
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
                Synchronized with meteorological forecast engine
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

        {/* Sync Info notice */}
        <div className="mb-4 text-xs text-slate-500 flex items-center justify-between bg-sky-50/50 p-2.5 rounded-lg border border-sky-100">
          <span className="flex items-center gap-1.5 text-sky-900 font-medium">
            <Info className="w-3.5 h-3.5 text-sky-600" />
            Live Forecast Engine Ready
          </span>
          <span className="text-[11px] font-mono text-slate-400">{lastSyncTime}</span>
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
