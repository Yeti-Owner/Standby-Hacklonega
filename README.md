# Standby

Speak or type a flight. Standby combines **Snowflake-powered delay analysis** with flight search, airport weather, terminal maps, and an interactive globe.

## Why Snowflake

Snowflake is our analytical engine. Parameterized SQL queries OAG flight-status data (or a BTS-compatible table) for the selected airline, airport, and departure hour:

- Frequency of delays over 15 minutes.
- Average delay when late and the historical sample size.
- Query execution time, displayed in the app.

Repeated lookups are cached. Results are historical evidence, not guaranteed predictions.

**The next step is a Snowflake-native search flow.** With a Snowflake key/token, Cortex permissions, and a Cortex integration, [Cortex Agents](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents) could orchestrate the entire conversation and live-search tools, with Cortex Analyst for flight-data questions and Cortex Search for airport/airline context. This is future work. Today, Snowflake handles SQL analytics; Groq/OpenAI handles AI interpretation when needed.

## Run

Requires Python 3.11+ and Node.js 20.9+.

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci --prefix standby-app
Copy-Item .env.example .env
```

For first-time setup, fill `.env` with your **Snowflake account, login, warehouse, and flight table**, a flight-provider key, and Groq/OpenAI key. Keep an existing `.env`. Voice also needs the local `Underdog-Bark-3.0-Clean/` model; typing works without it.

Double-click **start.bat**. Keep its terminal open; **Ctrl+C** stops everything. Use `start.bat --dev` while editing.

Try: “I'm flying from JFK to Heathrow tomorrow around seven in the evening.” Review the transcript, then confirm. Enter a published terminal or gate to focus the map.

Built by **Callum Maclean and Tomas Karounas**. [Data/model credits](ATTRIBUTIONS.md).
