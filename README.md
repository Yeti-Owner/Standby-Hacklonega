# Standby

A one-off voice-first flight concierge: resolve a flight, see airport weather and
ground conditions, and explore historical departure-delay frequency in Snowflake.

## Run on Windows

Double-click **start.bat**, or run from this folder:

```powershell
.\.venv\Scripts\python.exe app.py
```

The UI opens at http://127.0.0.1:7860. Edit `.env` with your Groq key, SerpApi or
AviationStack key, and Snowflake settings. Restart after changing settings. Weather
and ground-condition sources need no additional keys.

## Use

For voice, wait for **Voice ready**, record and stop, then choose **Transcribe &
review**. Edit the **Is this correct?** popup and choose **Yes, analyze this request**
or **No, record again**. No external lookups start before Yes. Outside clicks do
not dismiss the popup; Escape chooses No. Typed requests use **Analyze request**.

Clear requests are interpreted locally before the flight agent runs: “J F K” is
JFK, “Heathrow” is LHR, and “tomorrow around seven in the evening” is tomorrow at
19:00 in the departure airport's time unless an explicit timezone is given.
Relative dates use `APP_TIMEZONE` (default `America/New_York`). Complete requests
require a flight lookup; genuine missing details still prompt for clarification.
This adds no model calls or automatic API retries; the 50-request daily guard stays.

Inputs collapse during analysis; **New request** starts fresh after completion.
Bark warms up in the background, stays loaded, and uses an available NVIDIA GPU
with `BARK_DEVICE=auto`. Keep the terminal open. Use `cpu` to force CPU processing.

Try: “Um, Atlanta to Tokyo on Monday around five in the afternoon. What’s the delay risk?”

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
