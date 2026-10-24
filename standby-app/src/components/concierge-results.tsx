"use client";
import { useState } from "react";
import type { AirportInfo, FlightResult } from "@/lib/concierge";

const box = "rounded-2xl border border-sky-100 bg-white/95 p-4 sm:p-5 shadow-lg";
const safeUrl = (url?: string) => (url?.startsWith("https://") ? url : undefined);

function OfficialLink({ url, children }: { url?: string; children: React.ReactNode }) {
  const href = safeUrl(url);
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-sky-800 underline underline-offset-4 hover:text-sky-950 transition-colors"
    >
      {children}
    </a>
  ) : null;
}

function clock(value?: string | null, airport?: AirportInfo) {
  if (!value) return "Schedule unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: airport?.tz || "UTC",
    timeZoneName: "short",
  });
}

export default function ConciergeResults({ result }: { result: FlightResult }) {
  const [unit, setUnit] = useState<"F" | "C">("F");
  const flight = result.travel_context?.flight || result.selected_flight;
  const context = result.travel_context;
  const support = result.airline_support;
  const stats = result.historical;
  const ready = result.enrichment_status === "complete";
  const temp = (f?: number) =>
    f == null ? "Unavailable" : `${Math.round(unit === "F" ? f : ((f - 32) * 5) / 9)}°${unit}`;

  return (
    <div className="space-y-3.5" aria-label="Flight analysis results" aria-live="polite">
      {result.demo && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-xs font-bold text-amber-950">
          Demo data only. No real flight schedule, Snowflake query, weather lookup or API usage.
        </div>
      )}
      {result.error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          {result.error}
        </p>
      )}

      {/* a. Flight Header Card */}
      <div className={box}>
        <div className="flex flex-wrap items-baseline justify-between gap-1 border-b border-slate-100 pb-2.5 mb-2.5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              {result.airline_name || "Flight Details"}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {result.flight_number ||
                (result.schedule_source === "clarification_needed"
                  ? "More details needed"
                  : "No verified flight yet")}
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
            {result.schedule_source === "unverified_model_knowledge"
              ? "UNVERIFIED model suggestion"
              : result.schedule_source || "Not queried"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800 font-medium">
          <span className="font-bold text-slate-900">{result.route}</span>
          {result.aircraft_or_status && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-600">{result.aircraft_or_status}</span>
            </>
          )}
        </div>
      </div>

      {/* b. Two Stat Tiles Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Historical Delay Frequency */}
        <div className={box}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Historical delay frequency
          </h4>
          <p className="my-0.5 text-3xl font-black text-sky-800">
            {result.delay_probability_pct == null ? "Unavailable" : `${result.delay_probability_pct.toFixed(1)}%`}
          </p>
          <p className="text-xs font-semibold text-slate-700">15+ min departure delay</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Average when late:{" "}
            <span className="font-semibold text-slate-700">
              {result.avg_delay_mins == null ? "unavailable" : `${result.avg_delay_mins} min`}
            </span>
          </p>
        </div>

        {/* Snowflake Query Speed */}
        <div className={box}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Snowflake query speed
          </h4>
          <p className="my-0.5 text-3xl font-black text-sky-800">
            {result.snowflake_speed_ms == null ? "Not queried" : `${result.snowflake_speed_ms} ms`}
          </p>
          <p className="text-xs font-semibold text-slate-700">
            {result.historical_sample_size == null
              ? "No observed sample available"
              : `${result.historical_sample_size.toLocaleString()} departures analyzed`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.cache_hit ? "Cached result · instant fetch" : "Execution + fetch; connection excluded"}
          </p>
        </div>
      </div>

      {/* c. Weather & Airport Conditions */}
      {flight && (
        <div className={box}>
          <div className="mb-2.5 flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Weather & Airport Conditions</h3>
            <button
              type="button"
              onClick={() => setUnit(unit === "F" ? "C" : "F")}
              className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 border border-sky-200/80 hover:bg-sky-100 transition-colors cursor-pointer"
              aria-label="Toggle temperature unit"
            >
              °{unit === "F" ? "C" : "F"}
            </button>
          </div>

          {/* Departure and Landing panels side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(["departure", "arrival"] as const).map((side) => {
              const airport = side === "departure" ? flight.origin_airport : flight.destination_airport;
              const code = side === "departure" ? flight.origin_iata : flight.dest_iata;
              const time = side === "departure" ? flight.scheduled_departure : flight.scheduled_arrival;
              const forecast = context?.forecasts?.[side];
              const observation = airport?.icao ? context?.observations?.[airport.icao] : undefined;
              return (
                <article key={side} className="rounded-xl border border-sky-100/90 bg-slate-50/80 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                      {side === "departure" ? "Departure" : "Landing"}
                    </span>
                    <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                      {code}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">{airport?.city || code}</h4>
                  <p className="text-[11px] text-slate-500 truncate" title={airport?.name}>
                    {airport?.name}
                  </p>
                  <p className="pt-1 text-xs font-semibold text-slate-800">{clock(time, airport)}</p>
                  {side === "arrival" && flight.arrival_time_source === "provider_duration" && (
                    <p className="text-[10px] text-slate-500">Derived from provider flight duration</p>
                  )}
                  {forecast?.status === "available" ? (
                    <div className="pt-1 border-t border-slate-200/60 text-xs text-slate-700 space-y-0.5">
                      <p className="font-bold text-slate-900">
                        {forecast.description} · {temp(forecast.temperature_f)}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {forecast.precipitation_probability ?? "—"}% rain · {forecast.wind_mph ?? "—"} mph wind · gusts{" "}
                        {forecast.gust_mph ?? "—"} mph
                      </p>
                      {forecast.visibility_m != null && (
                        <p className="text-[11px] text-slate-600">
                          Visibility {(forecast.visibility_m / 1609.344).toFixed(1)} mi
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Forecast at flight time: {clock(forecast.valid_at, airport)}
                        {forecast.cache_hit ? " · cached" : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="pt-1 text-xs text-slate-500">
                      {forecast?.notice || (ready ? "Forecast unavailable." : "Checking forecast…")}
                    </p>
                  )}
                  {observation && (
                    <p className="pt-1 text-[11px] text-slate-600 border-t border-slate-200/60">
                      <span className="font-semibold">{observation.stale ? "Older METAR" : "Observed now"}:</span>{" "}
                      {observation.temperature_c == null
                        ? "temp unavailable"
                        : temp((observation.temperature_c * 9) / 5 + 32)}{" "}
                      {observation.flight_category} · {clock(observation.observed_at, airport)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          {/* Security & FAA status condensed beneath */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-700">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-bold text-slate-900">Security Wait (Origin):</span>
              {context?.security?.status === "available" ? (
                <span>
                  Standard: {context.security.standard_minutes} min ({context.security.standard_measurement})
                  {context.security.precheck_minutes != null &&
                    ` · PreCheck: ${context.security.precheck_minutes} min`}
                  <span className="text-[10px] text-slate-400 ml-1.5">
                    ({clock(context.security.updated_at, flight.origin_airport)})
                  </span>
                </span>
              ) : (
                <span className="text-slate-500">
                  {context?.security?.notice || (ready ? "Security wait unavailable." : "Checking security…")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-bold text-slate-900">FAA Status:</span>
              {context?.faa && Object.keys(context.faa).length ? (
                Object.entries(context.faa).map(([code, item]) => (
                  <span key={code} className="inline-flex items-center gap-1">
                    <span className="font-semibold text-slate-800">{code}:</span>
                    {item.events?.length
                      ? item.events.map((e) => `${e.scope_specific ? "GA restriction" : e.kind}: ${e.reason}`).join(" / ")
                      : item.status === "clear"
                        ? "Clear"
                        : item.status === "not_applicable"
                          ? "Outside FAA coverage"
                          : "Unavailable"}
                    {item.stale ? " (outdated)" : ""}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">
                  {ready ? "No active FAA disruptions reported." : "Checking FAA notices…"}
                </span>
              )}
            </div>
            {context?.notice && <p className="text-[11px] text-slate-500 italic">{context.notice}</p>}
          </div>

          {/* Sources line in small muted text */}
          <p className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Sources: <OfficialLink url="https://open-meteo.com/">Open-Meteo</OfficialLink>,{" "}
            <OfficialLink url="https://aviationweather.gov/">NOAA AWC</OfficialLink>,{" "}
            <OfficialLink url="https://nasstatus.faa.gov/">FAA</OfficialLink>,{" "}
            <OfficialLink url="https://securitywaittimes.com/data/">Security Wait Times</OfficialLink>. Current
            conditions do not change historical delay metrics.
          </p>
        </div>
      )}

      {/* d. Summary sentence and methodology note in one short card */}
      {(result.concierge_summary || stats?.notice || result.speech_time_s != null) && (
        <div className={`${box} text-xs leading-relaxed text-slate-700 space-y-1.5`}>
          {result.concierge_summary && (
            <p className="font-medium text-slate-900 text-sm">{result.concierge_summary}</p>
          )}
          {stats?.notice && <p className="text-[11px] text-slate-500">{stats.notice}</p>}
          {result.speech_time_s != null && (
            <p className="text-[10px] text-slate-400">Voice transcribed locally in {result.speech_time_s}s.</p>
          )}
        </div>
      )}

      {/* e. The two expandable sections collapsed by default, stacked at the bottom */}
      {support && (
        <details className={`${box} group`}>
          <summary className="cursor-pointer text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>{support.name} · delay, cancellation & rewards help</span>
            <span className="text-xs text-sky-700 font-semibold group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-700">
            <p className="text-[11px] text-slate-500">{support.identity_basis}. Confirm “operated by” on codeshares.</p>
            <div className="space-y-1.5">
              {support.offers.map(([label, text]) => (
                <p key={label}>
                  <strong className="text-slate-900">{label}.</strong> {text}
                </p>
              ))}
            </div>
            <div className="pt-1 flex flex-wrap gap-3">
              <OfficialLink url={support.policy}>Official disruption policy</OfficialLink>
              <OfficialLink url={support.claim}>Claim / contact instructions</OfficialLink>
            </div>
            {support.claim_tip && (
              <p className="text-[11px] text-slate-600 bg-sky-50/60 p-2 rounded-lg">{support.claim_tip}</p>
            )}
            {support.loyalty && (
              <div className="border-t border-slate-200/60 pt-2 space-y-1">
                <h5 className="font-bold text-slate-900">{support.program}</h5>
                <p className="text-[11px]">
                  Join or sign in, add membership number to bookings. Loyalty earnings are separate from disruption
                  compensation.
                </p>
                <OfficialLink url={support.loyalty}>Join / manage rewards</OfficialLink>
              </div>
            )}
            {support.rights.map((item) => (
              <p key={item.url} className="text-[11px]">
                <OfficialLink url={item.url}>{item.label}</OfficialLink>: {item.text}
              </p>
            ))}
            <p className="text-[10px] text-slate-400">
              {support.sources_reviewed && `Official summaries reviewed ${support.sources_reviewed}. `}Guidance only,
              not a legal award.
            </p>
          </div>
        </details>
      )}

      <details className={`${box} group`}>
        <summary className="cursor-pointer text-sm font-bold text-slate-900 flex items-center justify-between">
          <span>Data & scope details</span>
          <span className="text-xs text-sky-700 font-semibold group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-700">
          <p className="text-[11px] text-slate-600">
            Historical frequency describes airline + origin +{" "}
            {stats?.scope === "all_hours" ? "all departure hours" : "two adjacent departure hours"} across
            destinations. Canceled and missing departures are excluded. Not a calibrated prediction or guarantee.
          </p>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-2.5 text-[11px] font-mono text-slate-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}
