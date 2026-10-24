"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface RotatingEarthProps {
  width?: number;
  height?: number;
  className?: string;
  selectedCoordinates?: [number, number] | null; // [lng, lat]
  selectedAirportCode?: string | null;
}

export default function RotatingEarth({
  width = 800,
  height = 600,
  className = "",
  selectedCoordinates = null,
  selectedAirportCode = null,
}: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to coordinates for access in render loop
  const targetCoordsRef = useRef<[number, number] | null>(selectedCoordinates);
  targetCoordsRef.current = selectedCoordinates;

  const airportCodeRef = useRef<string | null>(selectedAirportCode);
  airportCodeRef.current = selectedAirportCode;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Set up responsive dimensions
    const getDims = () => {
      const containerWidth = Math.min(width, window.innerWidth > 1024 ? 540 : window.innerWidth - 48);
      const containerHeight = Math.min(height, 500);
      return { containerWidth, containerHeight };
    };

    let { containerWidth, containerHeight } = getDims();
    let radius = Math.min(containerWidth, containerHeight) / 2.3;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    context.scale(dpr, dpr);

    // Create projection and path generator for Canvas
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection).context(context);

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point;
      let inside = false;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      return inside;
    };

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry;
      if (!geometry) return false;

      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates;
        if (!pointInPolygon(point, coordinates[0])) {
          return false;
        }
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            return false;
          }
        }
        return true;
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false;
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) {
              return true;
            }
          }
        }
        return false;
      }

      return false;
    };

    const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
      const dots: [number, number][] = [];
      const bounds = d3.geoBounds(feature);
      const [[minLng, minLat], [maxLng, maxLat]] = bounds;

      const stepSize = dotSpacing * 0.08;

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat];
          if (pointInFeature(point, feature)) {
            dots.push(point);
          }
        }
      }

      return dots;
    };

    interface DotData {
      lng: number;
      lat: number;
    }

    const allDots: DotData[] = [];
    let landFeatures: any = null;

    let pulseAnim = 0;

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);

      const currentScale = projection.scale();
      const scaleFactor = currentScale / radius;

      // Draw ocean sphere (deep midnight aviation blue with atmospheric rim glow)
      context.beginPath();
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI);
      
      const oceanGrad = context.createRadialGradient(
        containerWidth / 2 - currentScale * 0.3,
        containerHeight / 2 - currentScale * 0.3,
        currentScale * 0.1,
        containerWidth / 2,
        containerHeight / 2,
        currentScale
      );
      oceanGrad.addColorStop(0, "#081d38");
      oceanGrad.addColorStop(0.85, "#030c18");
      oceanGrad.addColorStop(1, "#02070f");
      context.fillStyle = oceanGrad;
      context.fill();

      // Atmospheric outer glow rim
      context.strokeStyle = "rgba(56, 189, 248, 0.4)";
      context.lineWidth = 1.8 * scaleFactor;
      context.stroke();

      if (landFeatures) {
        // Draw graticule
        const graticule = d3.geoGraticule();
        context.beginPath();
        path(graticule());
        context.strokeStyle = "rgba(148, 163, 184, 0.18)";
        context.lineWidth = 1 * scaleFactor;
        context.stroke();

        // Draw land outlines
        context.beginPath();
        landFeatures.features.forEach((feature: any) => {
          path(feature);
        });
        context.strokeStyle = "rgba(56, 189, 248, 0.45)";
        context.lineWidth = 1.2 * scaleFactor;
        context.stroke();

        // Draw halftone dots
        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat]);
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath();
            context.arc(projected[0], projected[1], 1.15 * scaleFactor, 0, 2 * Math.PI);
            context.fillStyle = "#93c5fd";
            context.fill();
          }
        });

        // If an airport is selected, draw a pulsing navigation target pin!
        const target = targetCoordsRef.current;
        if (target) {
          const pin = projection(target);
          if (pin && pin[0] >= 0 && pin[0] <= containerWidth && pin[1] >= 0 && pin[1] <= containerHeight) {
            pulseAnim = (pulseAnim + 0.05) % (Math.PI * 2);
            const pulseR = (6 + Math.sin(pulseAnim) * 3) * scaleFactor;

            // Outer ping
            context.beginPath();
            context.arc(pin[0], pin[1], pulseR * 2, 0, 2 * Math.PI);
            context.strokeStyle = `rgba(245, 158, 11, ${0.4 - Math.sin(pulseAnim) * 0.2})`;
            context.lineWidth = 1.5;
            context.stroke();

            // Inner marker
            context.beginPath();
            context.arc(pin[0], pin[1], 4.5 * scaleFactor, 0, 2 * Math.PI);
            context.fillStyle = "#f59e0b";
            context.fill();
            context.strokeStyle = "#ffffff";
            context.lineWidth = 1.5;
            context.stroke();

            // Airport label badge
            const code = airportCodeRef.current;
            if (code) {
              context.font = "bold 11px system-ui, sans-serif";
              context.fillStyle = "#ffffff";
              context.fillText(code, pin[0] + 8, pin[1] - 8);
            }
          }
        }
      }
    };

    const loadWorldData = async () => {
      try {
        setIsLoading(true);
        // Try local cached data first for instant load, then fallback to GitHub
        let response: Response;
        try {
          response = await fetch("/data/ne_110m_land.json");
          if (!response.ok) throw new Error("Local fetch failed");
        } catch {
          response = await fetch(
            "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json"
          );
        }

        if (!response.ok) throw new Error("Failed to load land data");

        landFeatures = await response.json();

        // Generate dots for all land features
        landFeatures.features.forEach((feature: any) => {
          const dots = generateDotsInPolygon(feature, 16);
          dots.forEach(([lng, lat]) => {
            allDots.push({ lng, lat });
          });
        });

        render();
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load land map data");
        setIsLoading(false);
      }
    };

    // Set up rotation and interaction
    const rotation = [-84, -33]; // default tilted towards Americas
    let autoRotate = true;
    const rotationSpeed = 0.25;

    const rotate = () => {
      if (autoRotate) {
        rotation[0] += rotationSpeed;
        projection.rotate([rotation[0], rotation[1]]);
        render();
      } else {
        render();
      }
    };

    const rotationTimer = d3.timer(rotate);

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false;
      const startX = event.clientX;
      const startY = event.clientY;
      const startRotation = [...rotation];

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.4;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        rotation[0] = startRotation[0] + dx * sensitivity;
        rotation[1] = startRotation[1] - dy * sensitivity;
        rotation[1] = Math.max(-80, Math.min(80, rotation[1]));

        projection.rotate([rotation[0], rotation[1]]);
        render();
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        setTimeout(() => {
          autoRotate = true;
        }, 1500);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scaleFactor = event.deltaY > 0 ? 0.92 : 1.08;
      const newRadius = Math.max(radius * 0.6, Math.min(radius * 2.8, projection.scale() * scaleFactor));
      projection.scale(newRadius);
      render();
    };

    // Touch support for mobile!
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      autoRotate = false;
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const startRotation = [...rotation];

      const handleTouchMove = (moveEv: TouchEvent) => {
        if (moveEv.touches.length !== 1) return;
        const t = moveEv.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        rotation[0] = startRotation[0] + dx * 0.4;
        rotation[1] = Math.max(-80, Math.min(80, startRotation[1] - dy * 0.4));
        projection.rotate([rotation[0], rotation[1]]);
        render();
      };

      const handleTouchEnd = () => {
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        setTimeout(() => {
          autoRotate = true;
        }, 1500);
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: true });
      document.addEventListener("touchend", handleTouchEnd);
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });

    loadWorldData();

    return () => {
      rotationTimer.stop();
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", handleTouchStart);
    };
  }, [width, height]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-900/60 border border-slate-800 rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="text-rose-400 font-semibold mb-2">Error loading Earth visualization</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-xs rounded-2xl z-10 text-sky-200 text-sm">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-2" />
          <span>Calibrating Global Airspace Grid...</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="rounded-2xl cursor-grab active:cursor-grabbing shadow-2xl transition-transform"
      />
      <div className="absolute bottom-3 left-4 text-[11px] tracking-wide text-sky-200/80 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-sky-500/20 shadow-md">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
