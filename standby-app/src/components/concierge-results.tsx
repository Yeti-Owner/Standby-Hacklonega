"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { AirportInfo, FlightResult } from "@/lib/concierge";

const AirportGateMap = dynamic(() => import("@/components/AirportGateMap"), {
  ssr: false,
  loading: () => <p className="flex h-80 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-600">Loading terminal map…</p>,
});

const box = "rounded-2xl border border-sky-100 bg-white/95 p-5 shadow-lg";
const safeUrl = (url?: string) => url?.startsWith("https://") ? url : undefined;
function OfficialLink({ url, children }: { url?: string; children: React.ReactNode }) {
  const href = safeUrl(url);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-800 underline underline-offset-4">{children}</a> : null;
}
function clock(value?: string | null, airport?: AirportInfo) {
  if (!value) return "Schedule unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: airport?.tz || "UTC", timeZoneName: "short" });
}

export default function ConciergeResults({ result }: { result: FlightResult }) {
  const [unit, setUnit] = useState<"F" | "C">("F");
  const flight = result.travel_context?.flight || result.selected_flight;
  const context = result.travel_context;
  const support = result.airline_support;
  const stats = result.historical;
  const ready = result.enrichment_status === "complete";
  const temp = (f?: number) => f == null ? "Unavailable" : `${Math.round(unit === "F" ? f : (f - 32) * 5 / 9)}°${unit}`;
  return <section className="space-y-4" aria-label="Flight analysis results" aria-live="polite">
    {result.demo && <p className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 font-bold text-amber-950">Demo data only. No real flight schedule, Snowflake query, weather lookup or API usage.</p>}
    {result.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">{result.error}</p>}
    <div className={box}>
      <p className="text-sm font-semibold text-sky-700">{result.airline_name || "Flight details"}</p>
      <h3 className="text-3xl font-bold text-slate-900">{result.flight_number || (result.schedule_source === "clarification_needed" ? "More details needed" : "No verified flight yet")}</h3>
      <p className="mt-1 text-lg text-slate-800">{result.route}</p>
      <p className="text-sm text-slate-600">{result.aircraft_or_status}</p>
      <p className="mt-2 text-xs text-slate-600">{result.schedule_source === "unverified_model_knowledge" ? "UNVERIFIED model suggestion — confirm with the airline" : `Schedule source: ${result.schedule_source || "Not queried"}`}</p>
    </div>
    {flight && (flight.departure_gate?.trim() || flight.arrival_gate?.trim()) && <div className={box}>
      <h3 className="mb-3 text-xl font-bold text-slate-900">Airport terminal map</h3>
      <div className="space-y-5">{(["departure", "arrival"] as const).map(side => {
        const gate = (side === "departure" ? flight.departure_gate : flight.arrival_gate)?.trim();
        const code = side === "departure" ? flight.origin_iata : flight.dest_iata;
        return gate ? <article key={side}>
          <h4 className="mb-2 font-bold text-slate-700">{side === "departure" ? "Departure" : "Arrival"} · {code} · Gate {gate}</h4>
          <AirportGateMap airportCode={code} gate={gate} />
        </article> : null;
      })}</div>
    </div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className={box}><h4 className="font-bold text-slate-700">Historical delay frequency</h4><p className="my-1 text-4xl font-bold text-sky-800">{result.delay_probability_pct == null ? "Unavailable" : `${result.delay_probability_pct.toFixed(1)}%`}</p><p className="text-sm text-slate-700">15+ minute departure delay</p><p className="text-sm text-slate-600">Average when late: {result.avg_delay_mins == null ? "unavailable" : `${result.avg_delay_mins} min`}</p></div>
      <div className={box}><h4 className="font-bold text-slate-700">Snowflake query speed</h4><p className="my-1 text-4xl font-bold text-sky-800">{result.snowflake_speed_ms == null ? "Not queried" : `${result.snowflake_speed_ms} ms`}</p><p className="text-sm text-slate-700">{result.historical_sample_size == null ? "No observed sample available" : `${result.historical_sample_size.toLocaleString()} historical departures`}</p><p className="text-xs text-slate-600">{stats?.cache_hit ? "Cached result · original query time" : "Execution + fetch; connection time excluded"}</p></div>
    </div>
    {flight && <div className={box}>
      <div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-bold text-slate-900">Weather & airport conditions</h3><button type="button" onClick={() => setUnit(unit === "F" ? "C" : "F")} className="rounded-lg bg-sky-50 px-3 py-1 text-sm font-bold text-sky-800" aria-label="Toggle temperature unit">°{unit === "F" ? "C" : "F"}</button></div>
      <div className="grid gap-4 sm:grid-cols-2">{(["departure", "arrival"] as const).map(side => {
        const airport = side === "departure" ? flight.origin_airport : flight.destination_airport;
        const code = side === "departure" ? flight.origin_iata : flight.dest_iata;
        const time = side === "departure" ? flight.scheduled_departure : flight.scheduled_arrival;
        const forecast = context?.forecasts?.[side];
        const observation = airport?.icao ? context?.observations?.[airport.icao] : undefined;
        return <article key={side} className="rounded-xl border border-sky-100 bg-slate-50 p-3">
          <p className="text-sm font-bold text-sky-800">{side === "departure" ? "Departure" : "Landing"} · {code}</p><h4 className="text-xl font-bold">{airport?.city || code}</h4><p className="text-xs text-slate-600">{airport?.name}</p><p className="my-2 text-sm font-semibold">{clock(time, airport)}</p>
          {side === "arrival" && flight.arrival_time_source === "provider_duration" && <p className="text-xs text-slate-600">Arrival derived from provider flight duration</p>}
          {forecast?.status === "available" ? <><p className="font-bold">{forecast.description} · {temp(forecast.temperature_f)}</p><p className="text-xs">{forecast.precipitation_probability ?? "—"}% rain · {forecast.wind_mph ?? "—"} mph wind · gusts {forecast.gust_mph ?? "—"} mph</p>{forecast.visibility_m != null && <p className="text-xs">Visibility {(forecast.visibility_m / 1609.344).toFixed(1)} mi</p>}<p className="mt-1 text-xs text-slate-600">Forecast near {side === "arrival" ? "landing" : "departure"}: {clock(forecast.valid_at, airport)}{forecast.cache_hit ? " · cached" : ""}</p></> : <p className="text-sm text-slate-600">{forecast?.notice || (ready ? "Forecast unavailable for this flight time." : "Checking forecast at flight time…")}</p>}
          {observation && <p className="mt-2 text-xs text-slate-600">{observation.stale ? "Older observation" : "Observed now"}: {observation.temperature_c == null ? "temperature unavailable" : temp(observation.temperature_c * 9 / 5 + 32)} {observation.flight_category} · {clock(observation.observed_at, airport)}</p>}
        </article>;
      })}</div>
      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <h4 className="font-bold">Departure security now</h4>{context?.security?.status === "available" ? <><p>Standard: {context.security.standard_minutes} min ({context.security.standard_measurement}){context.security.precheck_minutes != null && ` · PreCheck: ${context.security.precheck_minutes} min (${context.security.precheck_measurement})`}</p><p className="text-xs">Updated {clock(context.security.updated_at, flight.origin_airport)} · Current estimate, not a forecast for your departure day</p></> : <p>{context?.security?.notice || (ready ? "Security wait unavailable." : "Checking security estimates…")}</p>}
        <h4 className="pt-2 font-bold">FAA airport status now</h4>
        {context?.faa && Object.keys(context.faa).length ? Object.entries(context.faa).map(([code, item]) => <div key={code}><p>{code}: {item.events?.length ? item.events.map(event => `${event.scope_specific ? "General-aviation restriction" : event.kind}: ${event.reason}`).join(" / ") : item.status === "clear" ? "No active FAA disruption reported" : item.status === "not_applicable" ? "Outside US FAA coverage" : "Status unavailable"}{item.stale ? " · outdated feed" : ""}</p>{item.updated_at && <p className="text-xs">Feed updated {clock(item.updated_at)}</p>}</div>) : <p>{ready ? "FAA status unavailable for this route." : "Checking current FAA notices…"}</p>}
        {context?.notice && <p>{context.notice}</p>}
      </div>
      <p className="mt-4 text-xs text-slate-600">Sources: <OfficialLink url="https://open-meteo.com/">Open-Meteo</OfficialLink> (CC BY 4.0), <OfficialLink url="https://aviationweather.gov/">NOAA AWC</OfficialLink>, <OfficialLink url="https://nasstatus.faa.gov/">FAA</OfficialLink>, <OfficialLink url="https://securitywaittimes.com/data/">Security Wait Times</OfficialLink> (CC BY 4.0). Current conditions do not change the historical delay percentage.</p>
    </div>}
    {result.concierge_summary && <p className="rounded-xl bg-white/85 p-4 text-base leading-relaxed text-slate-800">{result.concierge_summary}</p>}
    {stats?.notice && <p className="text-sm text-slate-700">{stats.notice}</p>}
    {result.speech_time_s != null && <p className="text-xs text-slate-600">Voice transcribed locally in {result.speech_time_s}s.</p>}
    {support && <details className={box}><summary className="cursor-pointer text-lg font-bold text-slate-900">{support.name} · delay, cancellation & rewards help</summary><p className="my-3 text-xs text-slate-600">{support.identity_basis}. Confirm “operated by” on codeshares.</p><div className="space-y-3 text-sm text-slate-700">{support.offers.map(([label, text]) => <p key={label}><b>{label}.</b> {text}</p>)}<OfficialLink url={support.policy}>Official disruption policy</OfficialLink><h4 className="pt-2 font-bold">How to claim</h4><ol className="list-decimal space-y-2 pl-5"><li>Ask the airline desk or app about rebooking and available vouchers.</li><li>Keep booking details, boarding passes, actual arrival times, the disruption reason and itemised receipts. Ask about expense limits before spending.</li><li>{support.claim_tip}</li></ol><OfficialLink url={support.claim}>Claim / contact instructions</OfficialLink>{support.loyalty && <div className="border-t border-slate-200 pt-3"><h4 className="font-bold">{support.program}</h4><p>Join or sign in, add your membership number to eligible bookings, and follow the program’s missing-points process if necessary. Fare and partner rules apply. Loyalty earnings are separate from disruption compensation; goodwill points or credits are not guaranteed.</p><OfficialLink url={support.loyalty}>Join / manage rewards</OfficialLink></div>}{support.rights.map(item => <p key={item.url}><OfficialLink url={item.url}>{item.label}</OfficialLink>: {item.text}</p>)}<p className="text-xs">{support.sources_reviewed && `Official-source summaries reviewed ${support.sources_reviewed}. `}Check current linked terms. This is guidance, not a compensation award. Standby does not submit claims or collect passenger details.</p></div></details>}
    <details className={box}><summary className="cursor-pointer font-bold">Data & scope details</summary><p className="my-3 text-sm text-slate-700">Historical frequency describes airline + origin + {stats?.scope === "all_hours" ? "all departure hours (widened after no matching time-window sample)" : "two adjacent departure hours"}, across destinations. Canceled and missing departures are excluded. This is not a calibrated prediction or a guarantee. No profiles or saved flights.</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(result, null, 2)}</pre></details>
  </section>;
}
