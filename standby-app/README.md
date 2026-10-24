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
