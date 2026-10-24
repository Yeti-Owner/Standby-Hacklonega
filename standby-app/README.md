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
