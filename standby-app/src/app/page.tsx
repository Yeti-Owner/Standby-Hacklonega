"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Cloudscape from "@/components/ui/cloudscape";
import { GlobeCdn, CdnMarker, CdnArc } from "@/components/ui/cobe-globe-cdn";
import AirportSearch from "@/components/airport-search";
import FlightInputs from "@/components/flight-inputs";
import TeamSection from "@/components/team-section";
import { ScrollFlyIn } from "@/components/ui/hero-section-3";
import { PuffyCloudDividerTop, PuffyCloudDividerBottom } from "@/components/puffy-cloud-divider";
import { Airport, AIRPORTS } from "@/lib/airports";
import { ChevronDown } from "lucide-react";

export default function Home() {
  // Flight Route State
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(AIRPORTS[0]);
  const [originAirport, setOriginAirport] = useState<Airport>(AIRPORTS[0]); // ATL
  const [destinationAirport, setDestinationAirport] = useState<Airport>(
    () => AIRPORTS.find((a) => a.iata === "ZRH") || AIRPORTS[12] || AIRPORTS[1]
  );
  const [layoverCount, setLayoverCount] = useState<0 | 1 | 2>(1);
  const [layoverAirport1, setLayoverAirport1] = useState<Airport>(
    () => AIRPORTS.find((a) => a.iata === "LHR") || AIRPORTS[4]
  );
  const [layoverAirport2, setLayoverAirport2] = useState<Airport | null>(
    () => AIRPORTS.find((a) => a.iata === "DXB") || AIRPORTS[6]
  );

  const commandSectionRef = useRef<HTMLElement>(null);
  const creatorsSectionRef = useRef<HTMLDivElement>(null);

  // Automatically smooth scroll down to Part 2 on airport search selection
  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setDestinationAirport(airport);
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

  // Build Arcs and Markers for GlobeCdn dynamically
  const originLoc: [number, number] = [originAirport.coordinates[1], originAirport.coordinates[0]];
  const destLoc: [number, number] = [destinationAirport.coordinates[1], destinationAirport.coordinates[0]];

  const flightMarkers: CdnMarker[] = [
    {
      id: "origin",
      location: originLoc,
      region: `FROM: ${originAirport.iata}`,
    },
  ];

  const flightArcs: CdnArc[] = [];

  if (layoverCount === 0) {
    flightArcs.push({
      id: "arc-direct",
      from: originLoc,
      to: destLoc,
    });
  } else if (layoverCount === 1) {
    const layover1Loc: [number, number] = [layoverAirport1.coordinates[1], layoverAirport1.coordinates[0]];
    flightMarkers.push({
      id: "layover-1",
      location: layover1Loc,
      region: `STOP: ${layoverAirport1.iata}`,
    });
    flightArcs.push({
      id: "arc-leg-1",
      from: originLoc,
      to: layover1Loc,
    });
    flightArcs.push({
      id: "arc-leg-2",
      from: layover1Loc,
      to: destLoc,
    });
  } else if (layoverCount === 2 && layoverAirport2) {
    const layover1Loc: [number, number] = [layoverAirport1.coordinates[1], layoverAirport1.coordinates[0]];
    const layover2Loc: [number, number] = [layoverAirport2.coordinates[1], layoverAirport2.coordinates[0]];
    flightMarkers.push({
      id: "layover-1",
      location: layover1Loc,
      region: `STOP 1: ${layoverAirport1.iata}`,
    });
    flightMarkers.push({
      id: "layover-2",
      location: layover2Loc,
      region: `STOP 2: ${layoverAirport2.iata}`,
    });
    flightArcs.push({
      id: "arc-leg-1",
      from: originLoc,
      to: layover1Loc,
    });
    flightArcs.push({
      id: "arc-leg-2",
      from: layover1Loc,
      to: layover2Loc,
    });
    flightArcs.push({
      id: "arc-leg-3",
      from: layover2Loc,
      to: destLoc,
    });
  }

  flightMarkers.push({
    id: "destination",
    location: destLoc,
    region: `TO: ${destinationAirport.iata}`,
  });

  // Calculate Great-circle distance
  function calculateDistanceNmi(coord1: [number, number], coord2: [number, number]) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 3440.065;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  let totalDistanceNmi = 0;
  if (layoverCount === 0) {
    totalDistanceNmi = calculateDistanceNmi(originAirport.coordinates, destinationAirport.coordinates);
  } else if (layoverCount === 1) {
    totalDistanceNmi =
      calculateDistanceNmi(originAirport.coordinates, layoverAirport1.coordinates) +
      calculateDistanceNmi(layoverAirport1.coordinates, destinationAirport.coordinates);
  } else if (layoverCount === 2 && layoverAirport2) {
    totalDistanceNmi =
      calculateDistanceNmi(originAirport.coordinates, layoverAirport1.coordinates) +
      calculateDistanceNmi(layoverAirport1.coordinates, layoverAirport2.coordinates) +
      calculateDistanceNmi(layoverAirport2.coordinates, destinationAirport.coordinates);
  }

  const estHours = totalDistanceNmi / 480 + (layoverCount + 1) * 0.4;
  const hoursStr = `${Math.floor(estHours)}h ${Math.round((estHours % 1) * 60)}m`;

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

          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={scrollToCommand}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-sky-600 hover:bg-sky-50/80 transition-all cursor-pointer"
            >
              Airspace Command
            </button>
            <button
              onClick={() => creatorsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-sky-600 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Creators
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PART 1: LANDING PAGE HERO (LARGE LOGO & SEARCH BAR ONLY)                 */}
      {/* ========================================================================= */}
      <section className="relative z-20 flex flex-col items-center justify-center min-h-[calc(100vh-76px)] px-4 sm:px-6 lg:px-8 -mt-2 sm:-mt-4">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Prominent Large Standby Logo Directly Above Search Bar */}
          <div className="relative w-full max-w-[1100px] h-[340px] sm:h-[420px] md:h-[480px] -mb-4 sm:-mb-6 md:-mb-8 animate-fade-in pointer-events-none select-none">
            <Image
              src="/images/standby-new-logo.png"
              alt="Standby"
              fill
              className="object-contain drop-shadow-md"
              priority
            />
          </div>

          {/* Main Airport Search Engine Component */}
          <div className="w-full">
            <AirportSearch
              onSelectAirport={handleSelectAirport}
              selectedAirport={destinationAirport}
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

      {/* ========================================================================= */}
      {/* SEAMLESS AIRPLANE TRANSITION OVERLAY (PAGE 1 TO PAGE 2)                   */}
      {/* ========================================================================= */}
      <ScrollFlyIn
        imageUrl="/images/private-jet.webp"
        imageAlt="Private jet flying across the screen"
        className="relative z-30"
      />

      {/* Puffy Cloud Divider 1 (Transition to Section 2) */}
      <PuffyCloudDividerTop fill="rgba(255, 255, 255, 0.7)" className="-mb-1 z-20 relative" />

      {/* ========================================================================= */}
      {/* PART 2: COMMAND CENTER (COBE GLOBE WITH ARCS + FLIGHT & WEATHER INPUTS)   */}
      {/* ========================================================================= */}
      <section
        id="command-center"
        ref={commandSectionRef}
        className="relative z-20 bg-white/40 backdrop-blur-md py-16 px-4 sm:px-6 lg:px-8 border-y border-white/40"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight">
              Global Arrival Station Command
            </h2>
          </div>

          {/* Split Screen Layout: Left = Cobe Globe with Lines, Right = Route & Weather Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Cobe Globe with Dynamic Flight Lines */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl border border-sky-100 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-sky-300 flex flex-col items-center">
                {/* Globe Header Telemetry */}
                <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100 mb-3 text-xs">
                  <div className="flex items-center space-x-2 text-sky-700 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                    <span className="font-extrabold uppercase tracking-wider">Live Flight Telemetry</span>
                  </div>
                  <div className="text-slate-700 font-mono font-bold text-xs bg-sky-50 border border-sky-200/80 px-3 py-1 rounded-full">
                    {originAirport.iata} ➔ {destinationAirport.iata} {layoverCount > 0 ? `(${layoverCount} Stop${layoverCount > 1 ? "s" : ""})` : "(Non-stop)"}
                  </div>
                </div>

                {/* Cobe 3D Globe with Arcs & Markers */}
                <div className="w-full max-w-[480px] aspect-square mx-auto">
                  <GlobeCdn
                    markers={flightMarkers}
                    arcs={flightArcs}
                    focusLocation={destLoc}
                    className="w-full h-full"
                  />
                </div>

                {/* Route Waypoint Stats Below Globe */}
                <div className="w-full mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Distance</span>
                    <span className="text-slate-900 font-bold font-mono text-sm">{totalDistanceNmi.toLocaleString()} nmi</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Est. Flight Time</span>
                    <span className="text-slate-900 font-bold font-mono text-sm">{hoursStr}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Flight Route</span>
                    <span className="text-sky-700 font-bold font-mono text-xs truncate block">
                      {layoverCount === 0 ? "Direct Non-Stop" : `${layoverCount} Layover Leg${layoverCount > 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Question Boxes (Flight Route & Weather) */}
            <div className="lg:col-span-6 flex justify-center">
              <FlightInputs
                selectedAirport={selectedAirport}
                originAirport={originAirport}
                onSelectOrigin={setOriginAirport}
                destinationAirport={destinationAirport}
                onSelectDestination={setDestinationAirport}
                layoverCount={layoverCount}
                onChangeLayoverCount={setLayoverCount}
                layoverAirport1={layoverAirport1}
                onSelectLayover1={setLayoverAirport1}
                layoverAirport2={layoverAirport2}
                onSelectLayover2={setLayoverAirport2}
              />
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
