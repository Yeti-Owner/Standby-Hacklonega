"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Cloudscape from "@/components/ui/cloudscape";
import RotatingEarth from "@/components/ui/wireframe-dotted-globe";
import AirportSearch from "@/components/airport-search";
import FlightInputs from "@/components/flight-inputs";
import TeamSection from "@/components/team-section";
import { PuffyCloudDividerTop, PuffyCloudDividerBottom } from "@/components/puffy-cloud-divider";
import { Airport, AIRPORTS } from "@/lib/airports";
import { Plane, ChevronDown, Compass, Globe2, Radio, Sparkles } from "lucide-react";

export default function Home() {
  // Default to Atlanta (ATL) or null until user searches
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(AIRPORTS[0]);
  const commandSectionRef = useRef<HTMLElement>(null);
  const creatorsSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    // Automatically smooth scroll down to Part 2 as requested!
    setTimeout(() => {
      commandSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);
  };

  const scrollToCommand = () => {
    commandSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen text-slate-900 overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* 1. Global Animated Cloudscape Motion Background */}
      <div className="fixed inset-0 w-full h-full -z-20 pointer-events-none">
        <Cloudscape
          speed={1.0}
          colorBottom="#38bdf8"
          colorMid="#e0f2fe"
          colorTop="#ffffff"
          height="100vh"
          className="w-full h-full"
        />
      </div>

      {/* Subtle atmospheric vignette */}
      <div className="fixed inset-0 bg-gradient-to-b from-sky-200/20 via-transparent to-sky-950/20 pointer-events-none -z-10" />

      {/* Floating Header Navigation */}
      <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-md bg-white/70 border-b border-sky-100/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-sky-200/80 bg-white p-1">
              <Image
                src="/images/standby-logo.png"
                alt="Standby Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-sky-950 leading-none">
                Standby
              </span>
              <span className="text-[10px] font-bold tracking-widest text-sky-600 uppercase font-mono">
                Aviation OS
              </span>
            </div>
          </div>

          <nav className="flex items-center space-x-2 sm:space-x-4 text-xs font-semibold">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-3 py-1.5 text-slate-700 hover:text-sky-700 rounded-lg hover:bg-sky-50/80 transition-colors cursor-pointer"
            >
              Search
            </button>
            <button
              onClick={scrollToCommand}
              className="px-3 py-1.5 text-slate-700 hover:text-sky-700 rounded-lg hover:bg-sky-50/80 transition-colors cursor-pointer"
            >
              Flight & Weather
            </button>
            <button
              onClick={() => creatorsSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Creators
            </button>
          </nav>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PART 1: LANDING PAGE HERO                                                */}
      {/* ========================================================================= */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-12 pb-24 text-center z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* App Logo Display */}
          <div className="relative mb-6 group cursor-default">
            <div className="absolute -inset-4 bg-sky-400/20 rounded-full blur-2xl group-hover:bg-sky-400/35 transition-all duration-700 animate-pulse-glow" />
            
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 bg-white/95 rounded-3xl p-5 shadow-2xl border-2 border-white/80 animate-float-gentle transition-transform duration-500">
              <Image
                src="/images/standby-logo.png"
                alt="Standby App Big Logo"
                fill
                className="object-contain p-3"
                priority
              />
            </div>
          </div>

          {/* App Brand Title */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-sky-200/80 text-sky-800 text-xs font-bold tracking-widest uppercase mb-4 shadow-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            Global Airway Intelligence System
          </div>

          {/* Main User Specified Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-950 tracking-tight leading-[1.08] mb-4">
            Where are you going next?
          </h1>

          <div className="bg-white/80 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-sky-100 shadow-sm max-w-2xl mb-8">
            <p className="text-base sm:text-lg text-slate-800 font-semibold leading-relaxed">
              Search any international airport across the world to load live airspace coordinates, arrival schedules, and meteorological telemetry.
            </p>
          </div>

          {/* Airport Search Engine Component */}
          <div className="w-full">
            <AirportSearch
              onSelectAirport={handleSelectAirport}
              selectedAirport={selectedAirport}
            />
          </div>

          {/* Destination Preview Tag */}
          {selectedAirport && (
            <div className="mt-8 inline-flex items-center gap-3 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl border border-sky-200/80 shadow-md animate-in fade-in zoom-in-95 duration-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs text-slate-500 font-medium">Selected Destination:</span>
              <span className="text-sm font-bold text-sky-950">
                {selectedAirport.city} ({selectedAirport.iata})
              </span>
              <button
                onClick={scrollToCommand}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 underline flex items-center gap-1 cursor-pointer ml-1"
              >
                Inspect Telemetry
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Scroll Down Call to Action */}
          <div className="mt-12">
            <button
              onClick={scrollToCommand}
              className="group flex flex-col items-center cursor-pointer"
            >
              <span className="mb-2 tracking-wider uppercase text-xs font-extrabold text-sky-950 bg-white/80 backdrop-blur-xs px-3.5 py-1 rounded-full border border-sky-200/80 shadow-xs">
                Explore Airspace & Telemetry
              </span>
              <div className="w-10 h-10 rounded-full bg-white/95 border border-sky-300 shadow-lg flex items-center justify-center group-hover:translate-y-1.5 transition-transform">
                <ChevronDown className="w-5 h-5 text-sky-600 animate-bounce" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Puffy Cloud Divider 1 (Transition to Section 2) */}
      <PuffyCloudDividerTop fill="#f8fafc" className="-mb-1 z-20 relative" />

      {/* ========================================================================= */}
      {/* PART 2: COMMAND CENTER (ROTATING GLOBE + FLIGHT & WEATHER INPUTS)         */}
      {/* ========================================================================= */}
      <section
        id="command-center"
        ref={commandSectionRef}
        className="relative z-20 bg-slate-50/95 backdrop-blur-xl py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200/60"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold tracking-wider uppercase mb-3">
              <Globe2 className="w-3.5 h-3.5 text-sky-600" />
              Live Flight & Meteorological Telemetry
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Global Arrival Station Command
            </h2>
            <p className="mt-3 text-slate-600 text-base sm:text-lg font-medium">
              Interact with the live 3D dotted earth visualization on the left, and adjust flight arrival parameters with synchronized weather forecast telemetry on the right.
            </p>
          </div>

          {/* Split Screen Layout: Left = Dotted Globe, Right = Question Boxes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Rotating Dotted Globe */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full bg-slate-950 rounded-3xl p-4 sm:p-6 shadow-2xl border border-sky-500/20 relative overflow-hidden">
                {/* Globe Header Telemetry */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 text-xs">
                  <div className="flex items-center space-x-2 text-sky-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span className="font-bold">WAYPOINT ACTIVE</span>
                  </div>
                  {selectedAirport && (
                    <div className="text-slate-400 font-mono text-[11px]">
                      {selectedAirport.coordinates[1].toFixed(2)}° N, {selectedAirport.coordinates[0].toFixed(2)}° W
                    </div>
                  )}
                </div>

                {/* D3 Wireframe Dotted Earth Canvas */}
                <RotatingEarth
                  selectedCoordinates={selectedAirport?.coordinates || null}
                  selectedAirportCode={selectedAirport?.iata || null}
                  width={560}
                  height={500}
                  className="w-full"
                />

                {/* Airport Waypoint Stats Below Globe */}
                {selectedAirport && (
                  <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Station</span>
                      <span className="text-white font-bold font-mono text-sm">{selectedAirport.iata}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Elevation</span>
                      <span className="text-white font-bold font-mono text-sm">{selectedAirport.elevationFt} ft</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Time Zone</span>
                      <span className="text-white font-bold font-mono text-xs truncate block">{selectedAirport.timezone.split(" ")[0]}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Question Boxes (Flight & Weather) */}
            <div className="lg:col-span-6 flex justify-center">
              <FlightInputs selectedAirport={selectedAirport} />
            </div>
          </div>
        </div>
      </section>

      {/* Puffy Cloud Divider 2 (Transition to Section 3) */}
      <PuffyCloudDividerBottom fill="#f8fafc" className="z-20 relative" />

      {/* ========================================================================= */}
      {/* PART 3: CREATED BY (MEET THE CREATORS)                                   */}
      {/* ========================================================================= */}
      <div ref={creatorsSectionRef}>
        <TeamSection />
      </div>
    </div>
  );
}
