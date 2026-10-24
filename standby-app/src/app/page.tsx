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
import { ChevronDown, Globe2 } from "lucide-react";

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
      {/* 1. Global Animated Cloudscape Motion Picture Background */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <Cloudscape
          speed={1}
          colorBottom="#87ceeb"
          colorMid="#f8f8f8"
          colorTop="#ffffff"
          height="100%"
          className="w-full h-full bg-transparent"
        />
      </div>

      <div className="relative z-10">
        {/* Floating Header Navigation */}
        <header className="sticky top-0 z-50 px-4 sm:px-8 py-2.5 backdrop-blur-md bg-white/75 border-b border-sky-100/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative h-14 sm:h-16 w-48 sm:w-60 flex items-center">
              <Image
                src="/images/standby-new-logo.png"
                alt="Standby"
                fill
                className="object-contain object-left group-hover:scale-105 transition-transform duration-300"
                priority
              />
            </div>
          </div>

          <nav className="flex items-center space-x-2 sm:space-x-4 text-sm font-medium">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-3.5 py-1.5 text-slate-700 hover:text-sky-800 rounded-lg hover:bg-white/60 transition-colors cursor-pointer text-base"
            >
              Search
            </button>
            <button
              onClick={scrollToCommand}
              className="px-3.5 py-1.5 text-slate-700 hover:text-sky-800 rounded-lg hover:bg-white/60 transition-colors cursor-pointer text-base"
            >
              Flight & Weather
            </button>
            <button
              onClick={() => creatorsSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer text-base"
            >
              Creators
            </button>
          </nav>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PART 1: LANDING PAGE HERO                                                */}
      {/* ========================================================================= */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-2 pb-16 text-center z-10">
        <div className="max-w-5xl mx-auto flex flex-col items-center w-full">
          {/* Prominently Sized Standby Logo Centered Beautifully Above Search Bar */}
          <div className="relative w-full max-w-[400px] sm:max-w-[620px] md:max-w-[820px] lg:max-w-[980px] xl:max-w-[1100px] h-60 sm:h-80 md:h-[420px] lg:h-[480px] -mb-4 sm:-mb-6 md:-mb-8 flex items-center justify-center animate-float-gentle">
            <Image
              src="/images/standby-new-logo.png"
              alt="Standby"
              fill
              className="object-contain drop-shadow-md select-none"
              priority
            />
          </div>

          {/* Main Airport Search Engine Component */}
          <div className="w-full">
            <AirportSearch
              onSelectAirport={handleSelectAirport}
              selectedAirport={selectedAirport}
            />
          </div>

          {/* Scroll Down Call to Action */}
          <div className="mt-16">
            <button
              onClick={scrollToCommand}
              className="group flex flex-col items-center cursor-pointer"
              aria-label="Scroll to Airspace & Telemetry"
            >
              <span className="mb-2 tracking-wider uppercase text-[11px] font-extrabold text-sky-950 bg-white/80 backdrop-blur-xs px-3.5 py-1 rounded-full border border-sky-200/80 shadow-xs">
                Explore Airspace & Telemetry
              </span>
              <div className="w-10 h-10 rounded-full bg-white/95 border border-sky-300 shadow-md flex items-center justify-center group-hover:translate-y-1.5 transition-transform">
                <ChevronDown className="w-5 h-5 text-sky-600 animate-bounce" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Puffy Cloud Divider 1 (Transition to Section 2) */}
      <PuffyCloudDividerTop fill="rgba(255, 255, 255, 0.7)" className="-mb-1 z-20 relative" />

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* PART 2: COMMAND CENTER (ROTATING GLOBE + FLIGHT & WEATHER INPUTS)         */}
      {/* ========================================================================= */}
      <section
        id="command-center"
        ref={commandSectionRef}
        className="relative z-20 bg-white/40 backdrop-blur-md py-16 px-4 sm:px-6 lg:px-8 border-y border-white/40"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 border border-sky-200/80 text-sky-900 text-xs font-bold tracking-wider uppercase mb-3 shadow-xs">
              <Globe2 className="w-3.5 h-3.5 text-sky-600" />
              Live Flight & Meteorological Telemetry
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight">
              Global Arrival Station Command
            </h2>
            <p className="mt-3 text-slate-800 text-base sm:text-lg font-semibold">
              Interact with the live 3D dotted earth visualization on the left, and adjust flight arrival parameters with synchronized weather forecast telemetry on the right.
            </p>
          </div>

          {/* Split Screen Layout: Left = Dotted Globe, Right = Question Boxes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Rotating Dotted Globe */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full bg-slate-950/90 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl border border-sky-400/30 relative overflow-hidden">
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
      <PuffyCloudDividerBottom fill="rgba(255, 255, 255, 0.7)" className="z-20 relative" />

      {/* ========================================================================= */}
      {/* PART 3: CREATED BY (MEET THE CREATORS)                                   */}
      {/* ========================================================================= */}
      <div ref={creatorsSectionRef}>
        <TeamSection />
      </div>
      </div>
    </div>
  );
}
