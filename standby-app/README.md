# Standby frontend

Next.js + React. See the [main README](../README.md) for setup and the Snowflake workflow.

From the repository root, run `start.bat` or `start.bat --dev`. Keys stay in the root `.env`.

The frontend provides voice/text flight search, Snowflake result cards, an interactive globe, and terminal/gate maps. JFK and Heathrow include real bundled OpenStreetMap extracts so their terminal areas load without Overpass. Other airports use a cached, bounded lookup through the local Python backend. Browser and disk caches avoid repeat requests; unavailable locations are labeled rather than guessed.

Checks: `npm run lint` and `npm run build` from this folder.
