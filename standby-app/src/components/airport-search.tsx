"use client";

import { useState, useRef, useEffect } from "react";
import { Airport, AIRPORTS } from "@/lib/airports";
import { Search, Plane, MapPin, X, Compass, ChevronRight, Mic, MicOff } from "lucide-react";

interface AirportSearchProps {
  onSelectAirport: (airport: Airport) => void;
  selectedAirport: Airport | null;
}

export default function AirportSearch({
  onSelectAirport,
  selectedAirport,
}: AirportSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setQuery(transcript);
          setIsOpen(true);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleVoiceSearch = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current?.start(), 150);
        }
      } else {
        inputRef.current?.focus();
      }
    }
  };

  // Filter airports
  const filteredAirports = query.trim() === ""
    ? []
    : AIRPORTS.filter((apt) => {
        const q = query.toLowerCase();
        return (
          apt.iata.toLowerCase().includes(q) ||
          apt.icao.toLowerCase().includes(q) ||
          apt.name.toLowerCase().includes(q) ||
          apt.city.toLowerCase().includes(q) ||
          apt.country.toLowerCase().includes(q)
        );
      }).slice(0, 7);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (airport: Airport) => {
    setQuery(`${airport.iata} — ${airport.city}`);
    setIsOpen(false);
    onSelectAirport(airport);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredAirports.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % filteredAirports.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + filteredAirports.length) % filteredAirports.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredAirports[highlightIndex]) {
        handleSelect(filteredAirports[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const quickPicks = ["ATL", "JFK", "LHR", "HND", "DXB", "LAX"];

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto relative z-40">
      {/* Search Input Box */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-400/40 via-amber-400/30 to-blue-600/40 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition duration-500" />
        
        <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl border-2 border-sky-200/80 shadow-2xl overflow-hidden focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-400/20 transition-all duration-300">
          <div className="pl-5 pr-3 text-sky-600 flex items-center justify-center pointer-events-none">
            <Search className="w-6 h-6 stroke-[2.2]" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightIndex(0);
            }}
            onFocus={() => {
              if (query.trim().length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search airports by city, name, or code (e.g., ATL, London, JFK)..."
            aria-label="Airport search"
            className="w-full py-4 md:py-5 pr-3 text-slate-900 placeholder:text-slate-400 font-medium text-base md:text-lg bg-transparent focus:outline-none"
          />

          <div className="flex items-center gap-1 pr-3.5 flex-shrink-0">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Clear search"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleVoiceSearch}
              aria-label={isListening ? "Stop listening" : "Search by voice"}
              title={isListening ? "Listening... click to stop" : "Search by voice"}
              className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
                isListening
                  ? "text-rose-600 bg-rose-50 ring-2 ring-rose-400/40 animate-pulse"
                  : "text-slate-400 hover:text-sky-600 hover:bg-sky-50 active:scale-95"
              }`}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 text-rose-600" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && filteredAirports.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border border-sky-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Global Airway Hubs ({filteredAirports.length})</span>
            <span className="text-[11px] font-normal text-slate-400">Select to load airspace</span>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredAirports.map((airport, idx) => (
              <li
                key={airport.iata}
                onClick={() => handleSelect(airport)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                  highlightIndex === idx
                    ? "bg-sky-50 text-sky-950"
                    : "hover:bg-slate-50 text-slate-800"
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-10 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-sm tracking-wider shadow-sm flex-shrink-0">
                    {airport.iata}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 text-sm leading-snug">
                      {airport.city},{" "}
                      <span className="text-slate-600 font-normal">
                        {airport.country}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[260px] sm:max-w-md">
                      {airport.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-right">
                  <span className="hidden sm:inline-block text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {airport.timezone}
                  </span>
                  <ChevronRight className="w-4 h-4 text-sky-600" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Picks chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-700">
        <span className="font-semibold text-slate-800 flex items-center gap-1">
          <Plane className="w-3.5 h-3.5 text-sky-600 inline" />
          Popular Airspaces:
        </span>
        {quickPicks.map((code) => {
          const apt = AIRPORTS.find((a) => a.iata === code);
          if (!apt) return null;
          const isSelected = selectedAirport?.iata === code;
          return (
            <button
              key={code}
              onClick={() => handleSelect(apt)}
              className={`px-3 py-1 rounded-full border transition-all text-xs font-medium cursor-pointer ${
                isSelected
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white/80 hover:bg-white text-slate-700 hover:text-sky-700 border-sky-200/80 shadow-xs"
              }`}
            >
              <span className="font-bold">{code}</span> · {apt.city}
            </button>
          );
        })}
      </div>
    </div>
  );
}
