# Standby

A local, voice-first flight concierge. Speak or type a trip request to resolve a
flight and calculate historical departure-delay frequency with Snowflake.

## Run on Windows

Double-click **start.bat**, or run from this folder:

```powershell
.\.venv\Scripts\python.exe app.py
```

The app opens at http://127.0.0.1:7860. Edit `.env` with your Groq key, one flight
provider key (SerpApi or AviationStack), and Snowflake connection settings. Restart
the app after changing settings. Voice warms up in the background and stays loaded.
Wait for **Voice ready**, record and stop, then click **Analyze flight & delay risk**.
Choose **Type** to work while voice loads. A new recording clears the typed entry.
`BARK_DEVICE=auto` uses an available NVIDIA GPU; `cpu` forces CPU processing.

## Project contents

- `app.py`: speech, tools, historical calculation, and Gradio interface.
- `.env.example`: documented settings; `.env` holds private local values.
- `Underdog-Bark-3.0-Clean/`: local speech weights, loaders, and processor.
- `.venv/`: local Python environment and dependencies.
- `.cache/`: generated speech/UI caches.

Credentials, recordings, model files, and the Python environment are excluded
from Git. This local setup includes the model and environment in this folder.

To build a new environment with Python 3.12:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

If `.env` is missing, copy `.env.example` to `.env` and fill it in. A Git clone also
needs the model folder copied into the project. Runtime dependencies are installed
locally; Python 3.12 itself must be installed on the machine.

## Data and usage

Audio transcription runs locally with Underdog Bark Clean. Text is sent to the
selected AI provider; flight searches and history use their configured services.
Opening the UI makes no paid API requests. Repeated requests use process-local
caches. Each uncached analysis makes at most one flight-provider search and two
Snowflake queries, widening to all hours only when the initial sample is empty.

OAG uses `PUBLIC.FLIGHT_STATUS_LATEST_SAMPLE`. Departure delay is actual gate
departure minus scheduled departure. Results describe airline/origin/hour history
across destinations; canceled flights and missing actual departures are excluded.
Empty samples stay unavailable. Historical frequency is not a guaranteed forecast;
model-only schedule suggestions are labeled unverified.

Speech model: [ConwayResearch/Underdog-Bark-3.0-Clean](https://huggingface.co/ConwayResearch/Underdog-Bark-3.0-Clean),
CC-BY-4.0. Attribution and notices are retained in the model directory. Its Python
loader is adapted to read the bundled processor without downloading files.

## Hackathon usage guard

Groq is capped locally at **50 requests per calendar day**, persisted in
`.cache/groq-usage.json` across restarts. A verified-flight analysis uses two
model calls; an unverified fallback may use three. Outputs are capped at 1,024
tokens per call. The UI shows requests and reported token usage. Cached repeats
use no Groq requests, and opening the UI or preloading Bark uses none.
This guard does not account for other apps using the same Groq account; provider
rate/token limits can still be reached. Limits are configurable in `.env`.

## Short test requests

- Basic: “Atlanta to Tokyo on Monday around 5pm. What’s the delay risk?”
- Conversational: “Um, I’m going from JFK to Heathrow tomorrow, about seven in the evening. Can you check my flight?”
- City names: “Boston to Chicago O’Hare next Friday around 9am. How often are those flights late?”
- Missing details: “I’m flying to Japan.” Expect a request for origin, date, and time.
- Input isolation: type a trip, switch to Voice, then record a different trip. The typed entry should clear; only the recording is analyzed.
- Repeated request: analyze the same request twice. The second result should be cached with no extra Groq request.

Use short recordings (roughly 10–20 seconds) for the quickest demo. Flight options
and historical sample coverage vary; examples do not guarantee a matching sample.
