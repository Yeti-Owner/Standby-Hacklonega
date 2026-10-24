"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, Plane, Keyboard, LoaderCircle } from "lucide-react";
import DebugDemoButton from "@/components/debug-demo-button";
import { airportTranscriptSuggestion, checked, toWav, type AnalysisEvent, type FlightResult, type Status } from "@/lib/concierge";

type Props = { routeRequest: string; onResult: (result: FlightResult | null) => void; onResolved: (result: FlightResult) => void };
type Review = { transcript: string; review_token: string; speech_time_s: number };
const inputStyle = "w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 font-bold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50";

export default function ConciergePanel({ routeRequest, onResolved, onResult }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"voice" | "type">("voice");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const requestAbort = useRef<AbortController | null>(null);
  const lastFlight = useRef("");

  const refreshStatus = useCallback(async () => {
    try { setStatus(await (await checked(await fetch("/api/concierge/status", { cache: "no-store" }))).json()); }
    catch { setMessage("Waiting for the local Python engine. Start the app with start.bat."); }
  }, []);
  useEffect(() => {
    const initialPoll = setTimeout(() => { void refreshStatus(); }, 0); const poll = setInterval(() => { void refreshStatus(); }, 10000);
    return () => { clearTimeout(initialPoll); clearInterval(poll); requestAbort.current?.abort(); if (timer.current) clearTimeout(timer.current); if (recorder.current) recorder.current.onstop = null; stream.current?.getTracks().forEach(track => track.stop()); };
  }, [refreshStatus]);
  useEffect(() => {
    if (review && !dialog.current?.open) dialog.current?.showModal();
    if (!review && dialog.current?.open) dialog.current?.close();
  }, [review]);

  function apply(event: AnalysisEvent) {
    if (!event.result) return;
    onResult(event.result);
    const f = event.result.selected_flight;
    const key = f ? `${f.origin_iata}/${f.dest_iata}/${f.scheduled_departure}` : "";
    if (key && key !== lastFlight.current) { lastFlight.current = key; onResolved(event.result); }
    setMessage(event.done ? (event.result.error ? "Analysis needs attention." : "Analysis complete.") : "Flight found. Checking history and airport conditions…");
  }

  async function analyze(transcript: string, token?: string) {
    if (!transcript.trim()) { setError("Include your route, date and approximate departure time."); return; }
    setBusy(true); setError(""); setMessage("Finding your flight and checking historical delays…"); setConfirmed(transcript); onResult(null); lastFlight.current = "";
    requestAbort.current = new AbortController();
    try {
      const response = await checked(await fetch("/api/concierge/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, review_token: token }), signal: requestAbort.current.signal }));
      if (!response.body) throw new Error("No analysis stream received.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = ""; let complete = false;
      const consume = (line: string) => { if (line.trim()) { const event = JSON.parse(line) as AnalysisEvent; apply(event); complete ||= event.done; } };
      while (true) {
        const part = await reader.read(); pending += decoder.decode(part.value, { stream: !part.done });
        const lines = pending.split("\n"); pending = lines.pop() || ""; lines.forEach(consume);
        if (part.done) break;
      }
      consume(pending);
      if (!complete) throw new Error("The connection ended before analysis finished. Any partial results remain visible. No automatic retry was made.");
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed. Please try again."); }
    finally { setBusy(false); requestAbort.current = null; void refreshStatus(); }
  }

  async function transcribe(blob: Blob) {
    setBusy(true); setError(""); setText(""); onResult(null); setConfirmed(""); setMessage("Transcribing locally with the resident Bark model…");
    try {
      const body = new FormData(); body.append("audio", await toWav(blob), "request.wav");
      const item: Review = await (await checked(await fetch("/api/concierge/transcribe", { method: "POST", body }))).json();
      setReview(item); setReviewText(item.transcript); setMessage(`Voice transcribed locally in ${item.speech_time_s}s. Review it before any flight lookup.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not transcribe this audio. Try a shorter recording or type your request."); }
    finally { setBusy(false); if (upload.current) upload.current.value = ""; }
  }

  async function startRecording() {
    setError(""); setText(""); onResult(null); setConfirmed("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("This browser cannot record audio. Use a recent browser on localhost/HTTPS, upload audio, or type your request.");
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream.current); recorder.current = media;
      const chunks: Blob[] = [];
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      media.onstop = () => { stream.current?.getTracks().forEach(track => track.stop()); if (timer.current) clearTimeout(timer.current); setRecording(false); void transcribe(new Blob(chunks, { type: media.mimeType })); };
      media.start(); setRecording(true); setMessage("Recording… press Stop & review when finished. Maximum two minutes.");
      timer.current = setTimeout(() => { if (media.state === "recording") media.stop(); }, 120000);
    } catch (err) { stream.current?.getTracks().forEach(track => track.stop()); setError(err instanceof Error ? err.message : "Microphone access failed. Upload audio or type your request."); }
  }

  function rejectReview() {
    if (review) void fetch(`/api/concierge/review/${encodeURIComponent(review.review_token)}`, { method: "DELETE" });
    setReview(null); setReviewText(""); setMessage("Record again or type your request.");
  }

  const voiceReady = status?.voice.phase === "ready";
  const airportSuggestion = airportTranscriptSuggestion(reviewText);
  return <div className="w-full space-y-4" id="concierge-engine">
    <div className="rounded-2xl border border-sky-100 bg-white/95 p-6 shadow-xl md:p-7">
      <h3 className="text-xl font-bold text-slate-900">Flight concierge</h3>
      <p className="mt-1 text-sm text-slate-600">Speak naturally, type, or analyze the route above. We’ll find a nonstop flight and check the evidence.</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-900">{voiceReady ? `Voice ready · ${status?.voice.device || "local"}` : status?.voice.phase === "failed" ? "Voice unavailable · typed input ready" : "Warming up voice · typed input ready"}</span><span className="text-slate-600">{status?.usage}</span></div>
      {status?.missing_settings.length ? <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Live setup incomplete: {status.missing_settings.join(", ")}. Add settings to the root .env. The debug demo uses no credentials.</p> : null}
      {!confirmed && <div className="mt-4 space-y-3">
        <div className="flex gap-2" aria-label="Input method"><button type="button" disabled={busy || recording} aria-pressed={mode === "voice"} onClick={() => setMode("voice")} className={`rounded-lg px-4 py-2 font-bold ${mode === "voice" ? "bg-sky-100 text-sky-900" : "text-slate-600"}`}><Mic className="mr-1 inline h-4 w-4" />Voice</button><button type="button" disabled={busy || recording} aria-pressed={mode === "type"} onClick={() => setMode("type")} className={`rounded-lg px-4 py-2 font-bold ${mode === "type" ? "bg-sky-100 text-sky-900" : "text-slate-600"}`}><Keyboard className="mr-1 inline h-4 w-4" />Type</button></div>
        {mode === "voice" ? <div className="space-y-3"><p className="text-sm text-slate-600">Include origin, destination, day and approximate departure time. Audio stays on your laptop.</p><div className="flex flex-wrap gap-2">{recording ? <button type="button" onClick={() => recorder.current?.stop()} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 font-bold text-white"><Square className="h-4 w-4" />Stop & review</button> : <button type="button" disabled={busy || !voiceReady} onClick={() => void startRecording()} className={primary}><Mic className="h-4 w-4" />Record request</button>}<button type="button" disabled={busy || recording || !voiceReady} onClick={() => upload.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-3 font-semibold text-sky-900 disabled:opacity-50"><Upload className="h-4 w-4" />Upload audio</button><input ref={upload} type="file" accept="audio/*" className="hidden" aria-label="Upload travel request audio" onChange={event => { const file = event.target.files?.[0]; if (file) void transcribe(file); }} /></div></div> : <div className="space-y-3"><label htmlFor="typed-request" className="text-sm font-bold">Your travel request</label><textarea id="typed-request" value={text} onChange={event => setText(event.target.value)} maxLength={6000} rows={3} className={inputStyle} placeholder="I'm flying from JFK to Heathrow tomorrow around seven in the evening…" disabled={busy} /><button type="button" onClick={() => void analyze(text)} disabled={busy || !text.trim()} className={primary}><Plane className="h-4 w-4" />Analyze typed request</button></div>}
        <button type="button" disabled={busy || recording} onClick={() => void analyze(routeRequest)} className="w-full rounded-xl border border-sky-200 bg-sky-50 p-3 font-bold text-sky-900 disabled:opacity-50">Analyze selected direct route</button>
      </div>}
      {confirmed && <div className="mt-4 rounded-xl border-l-4 border-sky-600 bg-sky-50 p-3"><p className="text-xs font-semibold text-sky-800">Your confirmed request</p><p className="text-base text-slate-800">{confirmed}</p><button type="button" disabled={busy} onClick={() => { setConfirmed(""); onResult(null); setError(""); setMessage(""); lastFlight.current = ""; }} className="mt-2 text-sm font-bold text-sky-800 underline disabled:opacity-50">New request</button></div>}
      <div role="status" className="mt-3 text-sm text-slate-700">{busy && <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />}{message}</div>{error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      {status?.demo_available && <DebugDemoButton disabled={busy || recording} onResult={event => { setConfirmed(event.transcript); setError(""); apply(event); setMessage("Demo fixtures loaded. No API calls were made."); }} />}
    </div>
    <dialog ref={dialog} aria-labelledby="transcript-title" onCancel={event => event.preventDefault()} className="m-auto w-[min(92vw,640px)] rounded-2xl border border-sky-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm">
      <h2 id="transcript-title" className="text-3xl font-bold">Is this correct?</h2>
      <p className="my-3 text-base text-slate-600">Edit anything Bark misheard. We’ll analyze exactly the text below when you choose Yes.</p>
      <label htmlFor="reviewed-transcript" className="text-sm font-bold">Your transcript · click to edit</label>
      <textarea id="reviewed-transcript" autoFocus className={`${inputStyle} mt-2`} rows={5} maxLength={6000} value={reviewText} onChange={event => setReviewText(event.target.value)} />
      {airportSuggestion && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800">
        <p>Heard “{airportSuggestion.heard}”. Did you mean JFK (John F. Kennedy, New York)? Missing letters can be ambiguous.</p>
        <button type="button" disabled={busy} onClick={() => setReviewText(airportSuggestion.corrected)} className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold">Use JFK in transcript</button>
      </div>}
      <div className="mt-4 flex flex-col gap-2"><button type="button" className={primary} disabled={!reviewText.trim() || busy} onClick={() => { const token = review?.review_token; setReview(null); void analyze(reviewText, token); }}>Yes, analyze this request</button><button type="button" onClick={rejectReview} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold">No, record again</button></div><p className="mt-3 text-xs text-slate-600">No flight search, Groq call or Snowflake query starts before Yes.</p>
    </dialog>
  </div>;
}
