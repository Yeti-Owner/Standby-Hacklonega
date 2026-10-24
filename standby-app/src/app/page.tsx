"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Cloudscape from "@/components/ui/cloudscape";
import { GlobeCdn, CdnMarker, CdnArc } from "@/components/ui/cobe-globe-cdn";
import FlightSearchBar from "@/components/flight-search-bar";
import ConciergeResults from "@/components/concierge-results";
import TeamSection from "@/components/team-section";
import { motion, useScroll, useTransform } from "framer-motion";
import { PuffyCloudDividerTop, PuffyCloudDividerBottom } from "@/components/puffy-cloud-divider";
import { Airport, AIRPORTS } from "@/lib/airports";
import { ChevronDown } from "lucide-react";
import type { AirportInfo, FlightResult } from "@/lib/concierge";

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<FlightResult | null>(null);
  // Flight Route State
  const [originAirport, setOriginAirport] = useState<Airport>(AIRPORTS[0]); // ATL
  const [destinationAirport, setDestinationAirport] = useState<Airport>(
    () => AIRPORTS.find((a) => a.iata === "ZRH") || AIRPORTS[12] || AIRPORTS[1]
  );
  const [layoverCount, setLayoverCount] = useState<0 | 1 | 2>(0);
  const [layoverAirport1] = useState<Airport>(
    () => AIRPORTS.find((a) => a.iata === "LHR") || AIRPORTS[4]
  );
  const [layoverAirport2] = useState<Airport | null>(
    () => AIRPORTS.find((a) => a.iata === "DXB") || AIRPORTS[6]
  );

  function handleResolved(result: FlightResult) {
    const flight = result.travel_context?.flight || result.selected_flight;
    if (!flight) return;
    function fromInfo(code: string, info?: AirportInfo): Airport | undefined {
      const known = AIRPORTS.find(airport => airport.iata === code);
      if (known) return known;
      if (info?.lat == null || info.lon == null) return undefined;
      return { iata: code, icao: info.icao || "", name: info.name || code, city: info.city || code,
        country: info.country || "", coordinates: [info.lon, info.lat], elevationFt: 0, timezone: info.tz || "UTC",
        defaultTemp: 0, defaultWindKts: 0, defaultWindDir: 0, defaultHumidity: 0, defaultPressure: 0 };
    }
    const origin = fromInfo(flight.origin_iata, flight.origin_airport);
    const destination = fromInfo(flight.dest_iata, flight.destination_airport);
    if (origin) setOriginAirport(origin);
    if (destination) { setDestinationAirport(destination); }
    setLayoverCount(0);
  }

  const commandSectionRef = useRef<HTMLElement>(null);
  const creatorsSectionRef = useRef<HTMLDivElement>(null);
  const heroScrollRef = useRef<HTMLDivElement>(null);

  const [windowWidth, setWindowWidth] = useState(1920);

  useEffect(() => {
    const initialResize = requestAnimationFrame(() => setWindowWidth(window.innerWidth));
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(initialResize); window.removeEventListener("resize", handleResize); };
  }, []);

  // Direct scroll tracking for Pinned Page 1 and Airplane Flyover
  const { scrollY } = useScroll();

  // Airplane flight path across Page 1:
  // Starts offscreen left, sweeps horizontally across Page 1, exits offscreen right
  const planeX = useTransform(
    scrollY,
    [0, 40, 520, 650],
    [-1.35 * windowWidth, -1.35 * windowWidth, 1.35 * windowWidth, 1.35 * windowWidth]
  );
  const planeY = useTransform(
    scrollY,
    [0, 60, 280, 520, 650],
    [30, 30, 0, -20, -20]
  );
  const planeRotate = useTransform(
    scrollY,
    [0, 60, 280, 520, 650],
    [-2, -2, 0, 1.8, 1.8]
  );
  const planeOpacity = useTransform(
    scrollY,
    [0, 20, 60, 480, 540, 650],
    [0, 0, 1, 1, 0, 0]
  );

  // Page 1 stays 100% pinned in place (0 to 260px) while the plane flies across,
  // then fades out and dissolves super smoothly as the plane exits (260px to 460px)
  const heroOpacity = useTransform(
    scrollY,
    [0, 260, 460, 650],
    [1, 1, 0, 0]
  );
  const heroScale = useTransform(
    scrollY,
    [0, 260, 460, 650],
    [1, 1, 0.95, 0.95]
  );
  const heroY = useTransform(
    scrollY,
    [0, 260, 460, 650],
    [0, 0, -30, -30]
  );

  // Page 2 (Command Center) smoothly fades in and rises up seamlessly (360px to 560px)
  const commandOpacity = useTransform(
    scrollY,
    [0, 360, 560, 650],
    [0, 0, 1, 1]
  );
  const commandY = useTransform(
    scrollY,
    [0, 360, 560, 650],
    [30, 30, 0, 0]
  );

  // Automatically smooth scroll down to Part 2 on airport search selection
  const handleSelectAirport = (airport: Airport) => {
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

  // Keep route GPU buffers and camera focus stable across unrelated UI updates.
  const { destLoc, flightMarkers, flightArcs } = useMemo(() => {
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

    return { destLoc, flightMarkers, flightArcs };
  }, [originAirport, destinationAirport, layoverCount, layoverAirport1, layoverAirport2]);

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

  const globeCard = (
    <div className="w-full h-full bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl border border-sky-100 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-sky-300 flex flex-col justify-between items-center">
      {/* Globe Header Telemetry */}
      <div className="w-full flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3 text-xs shrink-0">
        <div className="flex items-center space-x-2 text-sky-700 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
          <span className="font-extrabold uppercase tracking-wider text-[11px]">Flight route overview</span>
        </div>
        <div className="text-slate-700 font-mono font-bold text-xs bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 rounded-full">
          {originAirport.iata} ➔ {destinationAirport.iata} {layoverCount > 0 ? `(${layoverCount} Stop${layoverCount > 1 ? "s" : ""})` : "(Non-stop)"}
        </div>
      </div>

      {/* Cobe 3D Globe with Arcs & Markers - centered vertically in its card */}
      <div className="w-full flex-1 flex items-center justify-center my-auto py-2">
        <div className="w-full max-w-[420px] mx-auto">
          <GlobeCdn
            markers={flightMarkers}
            arcs={flightArcs}
            focusLocation={destLoc}
            className="w-full"
          />
        </div>
      </div>

      {/* Route Waypoint Stats Below Globe */}
      <div className="w-full mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs shrink-0">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Distance</span>
          <span className="text-slate-900 font-bold font-mono text-xs sm:text-sm">{totalDistanceNmi.toLocaleString()} nmi</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Illustrative flight time</span>
          <span className="text-slate-900 font-bold font-mono text-xs sm:text-sm">{hoursStr}</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Flight Route</span>
          <span className="text-sky-700 font-bold font-mono text-[11px] truncate block">
            {layoverCount === 0 ? "Non-Stop" : `${layoverCount} Stop${layoverCount > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>
    </div>
  );

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
        <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-2.5 backdrop-blur-md bg-white/75 border-b border-sky-100/80 transition-all duration-300">
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
      {/* PART 1: LANDING PAGE HERO (PINNED WITH PLANE FLYING OVER PAGE 1)          */}
      {/* ========================================================================= */}
      <div ref={heroScrollRef} style={{ height: "calc(100vh + 600px)" }} className="relative z-20">
        <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-16">
          {/* Page 1: Standby Logo & Search Bar */}
          <motion.div
            style={{
              opacity: heroOpacity,
              scale: heroScale,
              y: heroY,
            }}
            className="w-full max-w-4xl mx-auto flex flex-col items-center text-center relative z-10 pointer-events-auto"
          >
            {/* Standby Logo Directly Above Search Bar */}
            <div className="relative w-full max-w-md sm:max-w-xl md:max-w-2xl h-44 sm:h-56 md:h-64 mb-3 sm:mb-5 animate-fade-in pointer-events-none select-none">
              <Image
                src="/images/standby-new-logo.png"
                alt="Standby"
                fill
                className="object-contain drop-shadow-md"
                priority
              />
            </div>

            {/* Unified Flight Search Engine & Concierge Component */}
            <div className="w-full">
              <FlightSearchBar
                onSelectAirport={handleSelectAirport}
                selectedAirport={destinationAirport}
                originAirport={originAirport}
                destinationAirport={destinationAirport}
                onResult={setAnalysisResult}
                onResolved={handleResolved}
                onAnalyzeStart={scrollToCommand}
              />
            </div>

            {/* Scroll Down Call to Action */}
            <div className="mt-14 sm:mt-16">
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
          </motion.div>

          {/* Big Airplane Passing Directly Over The Whole Page 1 */}
          <motion.div
            style={{ x: planeX, y: planeY, rotate: planeRotate, opacity: planeOpacity }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30"
          >
            <Image unoptimized width={1600} height={900}
              src="/images/private-jet.webp"
              alt="Private jet flying across the screen"
              className="w-auto h-[50vh] sm:h-[62vh] md:h-[72vh] max-w-none filter drop-shadow-[0_35px_60px_rgba(15,23,42,0.38)] drop-shadow-[0_12px_24px_rgba(2,132,199,0.25)]"
              onError={(e) => {
                e.currentTarget.src = "/images/jet-fallback.svg";
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 2: COMMAND CENTER (COBE GLOBE WITH ARCS + FLIGHT & WEATHER INPUTS)   */}
      {/* ========================================================================= */}
      <motion.div
        style={{ opacity: commandOpacity, y: commandY }}
        className="-mt-[100vh] relative z-20"
      >
        {/* Puffy Cloud Divider 1 (Transition to Section 2) */}
        <div className="-mb-1 relative">
          <PuffyCloudDividerTop fill="rgba(255, 255, 255, 0.7)" />
        </div>

        <section
          id="command-center"
          ref={commandSectionRef}
          className="bg-white/40 backdrop-blur-md py-16 px-4 sm:px-6 lg:px-8 border-y border-white/40"
        >
        <div className="max-w-7xl mx-auto">
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight">
              Global Arrival Station Command
            </h2>
          </div>

          {/* Results Section Content */}
          {analysisResult ? (
            <ConciergeResults result={analysisResult} globeCard={globeCard} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* LEFT COLUMN: 3D Globe Card */}
              <div className="lg:col-span-5 flex flex-col w-full">
                {globeCard}
              </div>

              {/* RIGHT COLUMN: Awaiting Flight Selection */}
              <div className="lg:col-span-7 w-full flex flex-col">
                <div className="h-full rounded-2xl border border-sky-100 bg-white/95 backdrop-blur-md p-8 shadow-xl text-center space-y-4 flex flex-col justify-center items-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-50 border border-sky-200 text-sky-600">
                    <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">Awaiting Flight Selection</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Search for any route, city, or airport code in the command search above to inspect historical delays, Snowflake telemetry, weather, and airline support.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </motion.div>

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
