# Standby frontend

Tomas's Next.js/React design connected to Callum's local Python concierge engine.
From the repository root, run **start.bat** (or `start.bat --dev`). The root README
describes configuration, debug fixtures, voice review and offline tests.

The frontend proxies `/api/concierge/*` to the Python loopback server. No provider
keys belong here or in `NEXT_PUBLIC_*`. `concierge-panel.tsx` handles microphone,
upload, review and streamed analysis; `concierge-results.tsx` renders the complete
backend result in the existing design. `debug-demo-button.tsx` is intentionally
isolated for easy removal. The route controls, globe, hero and creator section keep
Tomas's visual language; simulated weather/flight telemetry has been replaced by
actual results or explicitly labeled planning illustrations.

`npm run lint` and `npm run build` run the frontend checks.

## Airport terminal map

`src/components/AirportGateMap.tsx` takes `airportCode` and `gate` and displays
a non-interactive MapLibre WebGL vector map using OpenFreeMap Positron. The camera
stays at zoom 16; the canvas preserves its drawing buffer. The wrapper applies
grayscale and contrast. No map keys, geocoding, or Overpass calls are required;
internet access is required for the style, vector tiles, fonts, and sprites.

The static terminal centers in `src/lib/airport-map.ts` cover ATL, LAX, JFK, ORD,
DFW, DEN, SFO, SEA, HND, and LHR. The gate pin intentionally marks that center,
**not the gate's actual location**. Terminal/building/label coverage depends on
the basemap; this version does not provide indoor routing or verified shops.
Unsupported airports and loading failures show a text fallback.

Flight results show maps when `departure_gate` or `arrival_gate` is supplied.
The existing Aviationstack adapter preserves those fields; providers without
gate data do not show a map. The Debug demo includes synthetic JFK/LHR gates
for testing without flight-provider calls (map tiles still load from OpenFreeMap).

For future rendering, pass a MapLibre style JSON/URL through optional `mapStyle`,
or use optional `onLoad` and `event.target` to add native custom WebGL/GLSL layers
or building extrusions. Keep those effects in the same canvas; no raster-map
replacement is needed.

## Globe interaction

Airport codes stay on the globe, with leader lines and collision-aware placement
for close or coincident airports. Visible labels update with the same projection
as the renderer and keep their preferred position to avoid flicker. Click a code
to center it. The corner toolbar has been removed.

Scroll over the globe to zoom (1x–3x), drag to rotate, pinch on touch, and double-click
or choose the small Reset view link to reset. Keyboard arrows rotate, + / - zoom,
0 resets, and Space pauses/resumes. Scrolling outside the globe moves the page.

Animation targets 60 fps, pauses off screen or in hidden tabs, and reuses the WebGL
context across route changes. Labels use transforms without per-frame DOM layout
measurements. Reduced-motion preferences pause automatic rotation by default.
