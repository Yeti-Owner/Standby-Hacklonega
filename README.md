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
the app after changing settings. Start with a typed request, then try the mic.

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
