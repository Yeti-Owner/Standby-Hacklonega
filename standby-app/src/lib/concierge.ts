export type AirportInfo = { iata: string; name?: string; city?: string; country?: string; lat?: number; lon?: number; tz?: string; icao?: string };
export type Flight = { flight_number?: string; airline_name?: string; airline_iata?: string; origin_iata: string; dest_iata: string; departure_gate?: string | null; arrival_gate?: string | null; departure_terminal?: string | null; arrival_terminal?: string | null; scheduled_departure?: string | null; scheduled_arrival?: string | null; aircraft_or_status?: string; arrival_time_source?: string; origin_airport?: AirportInfo; destination_airport?: AirportInfo };
type Forecast = { status?: string; temperature_f?: number; description?: string; precipitation_probability?: number; wind_mph?: number; gust_mph?: number; visibility_m?: number; valid_at?: string; notice?: string; cache_hit?: boolean };
type Observation = { temperature_c?: number; flight_category?: string; observed_at?: string; stale?: boolean };
type Security = { status?: string; standard_minutes?: number; precheck_minutes?: number; standard_measurement?: string; precheck_measurement?: string; updated_at?: string; notice?: string; cache_hit?: boolean };
type FaaStatus = { status?: string; stale?: boolean; updated_at?: string; events?: { kind: string; reason: string; scope_specific?: boolean }[] };
export type AirlineSupport = { name: string; airline_iata?: string; identity_basis: string; sources_reviewed?: string; coverage: string; offers: [string, string][]; claim_tip: string; policy?: string; claim?: string; program?: string; loyalty?: string; rights: { label: string; text: string; url: string }[] };
export type FlightResult = {
  flight_number?: string | null; airline_name?: string | null; route?: string | null; scheduled_departure?: string | null; scheduled_arrival?: string | null; aircraft_or_status?: string | null;
  delay_probability_pct?: number | null; historical_sample_size?: number | null; avg_delay_mins?: number | null; snowflake_speed_ms?: number | null;
  concierge_summary?: string; schedule_source?: string; selected_flight?: Flight; enrichment_status?: string; cache_hit?: boolean; demo?: boolean; error?: string; stage?: string;
  historical?: { notice?: string; scope?: string; total_flights?: number; delayed_flights?: number; query_time_ms?: number; cache_hit?: boolean };
  travel_context?: { notice?: string; flight?: Flight; forecasts?: { departure?: Forecast; arrival?: Forecast }; observations?: Record<string, Observation>; security?: Security; faa?: Record<string, FaaStatus> };
  airline_support?: AirlineSupport | null; input_method?: string; speech_time_s?: number | null;
};
export type Status = { voice: { phase: string; device?: string }; usage: string; missing_settings: string[]; demo_available: boolean };
export type AnalysisEvent = { transcript: string; result: FlightResult | null; done: boolean };

export async function checked(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${response.status}). Please try again.`);
  }
  return response;
}

// Decode locally in the browser to PCM WAV so Python's resident ASR needs no
// ffmpeg subprocess, cloud transcription, or second model instance.
export async function toWav(blob: Blob): Promise<Blob> {
  if (blob.size > 25 * 1024 * 1024) throw new Error("Use an audio file under 25 MB.");
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    if (!audio.length || audio.duration > 120) throw new Error("Use a recording between 0 and 120 seconds long.");
    const bytes = new ArrayBuffer(44 + audio.length * 2);
    const view = new DataView(bytes);
    const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    text(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); text(8, "WAVE"); text(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, audio.sampleRate, true); view.setUint32(28, audio.sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, audio.length * 2, true);
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
    for (let i = 0; i < audio.length; i++) {
      let value = 0;
      for (const channel of channels) value += channel[i] / channels.length;
      value = Math.max(-1, Math.min(1, value));
      view.setInt16(44 + i * 2, value < 0 ? value * 32768 : value * 32767, true);
    }
    return new Blob([bytes], { type: "audio/wav" });
  } finally { await context.close(); }
}
