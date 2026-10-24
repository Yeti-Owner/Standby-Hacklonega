# Standby

A one-off voice-first flight concierge: resolve a flight, see airport weather and
ground conditions, and explore historical departure-delay frequency in Snowflake.

## Run the combined app on Windows

Double-click **start.bat**. It builds Tomas's Next.js/React frontend, starts it on
http://127.0.0.1:3000, and starts Callum's Python engine on 127.0.0.1:7860. The browser
opens automatically. Keep the terminal open; Ctrl+C closes both servers. Bark warms
up once, stays loaded, and uses the existing local model and processor folder.
The original source branches are preserved; the integrated application lives on main.

First-time setup (the existing checkout already has these local dependencies):

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci --prefix standby-app
Copy-Item .env.example .env  # Only when .env does not already exist
.\.venv\Scripts\python.exe run.py
```

Node.js 20.9+ and Python 3.11+ are needed. Keep `Underdog-Bark-3.0-Clean/` including
its processor in the repository folder (ignored by Git). Fill the **root** `.env`
with Groq, flight-provider and Snowflake settings. Never put credentials in frontend
code or `NEXT_PUBLIC_*` variables. Restart after settings change. Public weather and
airport data need no keys. `STANDBY_API_PORT` and `STANDBY_WEB_PORT` change local ports.

For frontend development, use `start.bat --dev`. To use Callum's original Gradio
interface separately, close the combined servers and run `.\.venv\Scripts\python.exe app.py`.

## Use

The landing page, globe, fonts, clouds, animations and creator section come from
Tomas. Select airports in the route controls, then **Analyze selected direct route**,
or open **Flight concierge** and speak/type a conversational request. The selected
date/time means departure-airport local time. Globe waypoints are planning visuals;
the inherited flight engine resolves nonstop origin–destination flights. Resolved
flights update the globe. Illustrated route distance/time is not a verified schedule.

Wait for **Voice ready**, then **Record request** / **Stop & review**, or upload audio.
The browser converts audio to WAV locally. The existing resident Bark model handles
transcription. The **Is this correct?** dialog lets you edit the transcript; only
**Yes, analyze this request** contacts flight search, AI or Snowflake. **No, record
again** discards the temporary recording. Voice clears typed input. Audio is limited
to two minutes and deleted after analysis/rejection/expiry. There are no profiles or
saved-flight lists. **New request** clears the results.

Try: “I'm flying from J F K to Heathrow tomorrow around seven in the evening can
you check it?” Spoken codes and clear relative dates are resolved locally before
the agent decides whether more details are needed. `APP_TIMEZONE` (default
`America/New_York`) supplies the relative-day calendar. The daily Groq guard remains
50 requests, with no automatic AI or flight-search retries; caches still reduce use.

## Credential-free debug demo

When `.env` or necessary settings are missing, **Debug demo: JFK → Heathrow (no API
calls)** appears automatically. Set `STANDBY_SHOW_DEMO=1` in `.env` to show it even
with live settings. It loads the exact conversational test case above, with
tomorrow computed dynamically, and clearly labeled synthetic flight, historical
delay, landing-weather, security and airline-help examples. It never invokes ASR,
Groq, SerpApi, Snowflake or public weather APIs. It does not silently replace live
errors with fake data. Remove its import/render in
`standby-app/src/components/concierge-panel.tsx`, the `debug-demo-button.tsx`
component and `/api/demo` in `api.py` to remove the debug feature.

## Architecture and checks

`app.py` retains Callum's complete agent, ASR, SQL, caching, quotas, timezone logic,
airport integrations and airline registry. `api.py` adapts that same engine to JSON
and streamed NDJSON; it does not duplicate the flight logic. `standby-app/` is
Tomas's React frontend. Its same-origin `/api/concierge/*` proxy reaches the loopback
Python server; credentials and model weights stay on the laptop. `run.py` manages
both local servers. Do not run multiple live engines against the same usage counter.

Offline verification (no API charges):

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
node --experimental-strip-types --test tests/browser-audio.test.mjs
npm run lint --prefix standby-app
npm run build --prefix standby-app
```

The Node audio tests require Node 22.6+ with type stripping; the app itself supports
the Next.js minimum. Tests cover the exact transcript, editable review boundary,
streamed fields, cached repeats, demo isolation, audio cleanup, and WAV conversion.

## Results

- **Route:** airport names and local departure/landing dates and times. Arrival
  from provider flight duration is explicitly labeled when a schedule is absent.
- **Forecast near departure and landing:** Open-Meteo hourly conditions matched
  in UTC, displayed in each airport’s timezone. Missing times or dates beyond
  the 16-day forecast range stay unavailable. Unverified model suggestions never
  supply supposedly exact forecast times.
- **Observed now:** NOAA METAR conditions, separate from future forecasts. Reports
  older than two hours are not shown as current.
- **FAA now:** current U.S. airport-level disruptions, including scope and update
  time. A general-aviation restriction does not imply an airline flight is canceled.
- **Security now:** Standard/PreCheck readings independently labeled measured or
  modeled. Missing/stale readings can use the provider’s published primary model.
  These are current/typical waits, not travel-day predictions; checkpoint waits vary.
- **Historical delay:** OAG `PUBLIC.FLIGHT_STATUS_LATEST_SAMPLE` uses actual gate
  departure minus scheduled departure. The airline/origin/hour sample spans
  destinations and excludes canceled/missing departures. Historical frequency is
  not a calibrated forecast; weather and ground conditions do not alter its value.

Sources, raw responses, and data scope are in **Help & data details**.

## Usage and temporary data

Groq is guarded at **50 requests/day** across restarts, with reported token usage
shown in the UI and outputs capped at 1,024 tokens per call. A resolved-flight
analysis uses two model calls; unverified fallback may use three. The local guard
does not count other apps using your Groq account, and provider limits still apply.

Airport context adds no Groq calls, flight searches, or Snowflake queries. Public
lookups run in parallel after confirmation/flight resolution. Forecasts cache for
20 minutes; observations, FAA, and security cache for five. They do not poll on the
UI status timer. Failures leave flight/history results intact.

There are no profiles, saved-flight lists, or user trip history. API/transcript
caches stay in memory. Only the daily usage counter persists, in `.cache/`.
Gradio periodically deletes temporary audio older than one hour. `.env`, `.venv`,
model files, recordings, and generated caches are excluded from Git.

## Rebuild the local environment

With Python 3.12 installed:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

A clone also needs `Underdog-Bark-3.0-Clean/` copied into this folder. If `.env`
is missing, copy `.env.example` and fill it in; preserve existing credentials.
The included Bark loader uses its bundled processor offline and an explicit
audio-dependent decoding bound. Snowflake sessions explicitly log out on close.

## Sources and attribution

- [Underdog Bark Clean](https://huggingface.co/ConwayResearch/Underdog-Bark-3.0-Clean),
  CC BY 4.0; model notices retained, loader adapted for local processing.
- [Open-Meteo](https://open-meteo.com/), CC BY 4.0 data. The free endpoint is for
  non-commercial use, with a published allowance of 10,000 calls/day; multi-location
  and larger requests can count as multiple calls.
- [NOAA Aviation Weather Center](https://aviationweather.gov/) and
  [FAA NAS](https://nasstatus.faa.gov/).
- [Security Wait Times](https://securitywaittimes.com/data/), CC BY 4.0. Model
  fallback uses the source’s published time-of-day parameters; estimates are not
  guaranteed screening durations.
- [airportsdata](https://github.com/mborsetti/airportsdata), MIT; airport codes,
  names, coordinates and timezones are resolved locally.


## Airline disruption and rewards help

After a provider resolves a flight, expand the airline help section beneath the
results for delay/cancellation options, expense or compensation instructions,
official claim links, and the airline loyalty program. Curated guides cover BA,
Delta, American, United, JetBlue, Virgin Atlantic, ANA and JAL. Other carriers get
general steps and relevant US/UK/European regulator links, without guessed offers.
Confirm the operating airline on codeshares. Guidance describes possible options,
not an award decision or a prediction that the flight will be disrupted.

This feature runs locally from a small source-linked registry in `app.py`; it adds
no Groq, SerpApi, Snowflake or background web requests and stores no passenger data.
Official links open in your browser; claims and loyalty signups happen there.
Policy summaries were reviewed on 2026-10-24. Review `AIRLINE_SUPPORT` and its date
when updating the app; linked current airline terms take precedence.
