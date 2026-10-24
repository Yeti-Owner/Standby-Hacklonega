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
a non-interactive MapLibre WebGL vector map using OpenFreeMap Bright. The camera
stays at zoom 18, centered on the gate's mapped coordinates, with no tilt. The
canvas preserves its drawing buffer; the wrapper applies grayscale and 115%
contrast. Gate dots and labels use a GeoJSON source and canvas-rendered layers.

The static terminal centers in `src/lib/airport-map.ts` cover ATL, LAX, JFK, ORD,
DFW, DEN, SFO, SEA, HND, and LHR. A single Overpass request to
`https://overpass.private.coffee/api/interpreter` loads all gate nodes within 4 km
of the airport center. Successful complete responses (including empty results)
are cached without expiry in localStorage as `airport_gates_CODE` and
`airport_gate_CODE_GATE`. Different gates reuse the airport response. Concurrent
mounts and hot reloads share the request. Blocked storage falls back to memory;
errors/partial responses are not cached and there are no automatic retries.
Clear these keys in browser storage to refresh outdated gate data.

Unsupported airports, missing/ambiguous gates, and loading failures show a text
fallback; no airport-center pin is substituted. Terminal footprints come from
the vector basemap. Interior rooms/corridors depend on OSM coverage: this is not
a guaranteed indoor floor plan and does not provide routing or verified shops.
Internet access is required for uncached gate lookups and basemap assets.

Flight results always show the airport map section for a resolved route.
The existing Aviationstack adapter preserves `departure_gate` / `arrival_gate`.
Without a gate, each supported airport shows a zoom-16 terminal overview with
gate labels and no active pin. Enter a gate from the airline app or boarding
pass and choose **Show gate** to center its mapped location at zoom 18. This
manual selection does not claim the flight is assigned to that gate. Clear
the field and choose **Show airport** to return to the overview.
The Debug demo includes synthetic JFK/LHR gates
for testing without flight-provider calls. Synthetic gates may be unmapped;
gate data loads from Overpass once per airport, and map assets use OpenFreeMap.

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
