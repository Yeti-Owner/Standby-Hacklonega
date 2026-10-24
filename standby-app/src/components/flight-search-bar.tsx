"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, ChevronRight, Mic, Square, Upload, LoaderCircle } from "lucide-react";
import { Airport, AIRPORTS } from "@/lib/airports";
import DebugDemoButton from "@/components/debug-demo-button";
import { airportTranscriptSuggestion, checked, toWav, type AnalysisEvent, type FlightResult, type Status } from "@/lib/concierge";

interface FlightSearchBarProps {
  onSelectAirport: (airport: Airport) => void;
  selectedAirport: Airport | null;
  originAirport: Airport;
  destinationAirport: Airport;
  onResult: (result: FlightResult | null) => void;
  onResolved: (result: FlightResult) => void;
  onAnalyzeStart?: () => void;
}

type Review = { transcript: string; review_token: string; speech_time_s: number };

export default function FlightSearchBar({
  onSelectAirport,
  onResult,
  onResolved,
  onAnalyzeStart,
}: FlightSearchBarProps) {
  // Autocomplete & query state
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Concierge & speech state
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [, setConfirmed] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const requestAbort = useRef<AbortController | null>(null);
  const lastFlight = useRef("");

  // Airport suggestions
  const filteredAirports =
    query.trim() === ""
      ? []
      : AIRPORTS.filter((apt) => {
          const q = query.toLowerCase();
          return (
            apt.iata.toLowerCase().includes(q) ||
            apt.icao.toLowerCase().includes(q) ||
            apt.name.toLowerCase().includes(q) ||
            apt.city.toLowerCase().includes(q) ||
            apt.country.toLowerCase().includes(q)
          );
        }).slice(0, 7);

  // Status refresh
  const refreshStatus = useCallback(async () => {
    try {
      const res = await checked(await fetch("/api/concierge/status", { cache: "no-store" }));
      setStatus(await res.json());
    } catch {
      setMessage("Waiting for local Python engine (start.bat).");
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => {
      void refreshStatus();
    }, 0);
    const poll = setInterval(() => {
      void refreshStatus();
    }, 10000);
    return () => {
      clearTimeout(initial);
      clearInterval(poll);
      requestAbort.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current) recorder.current.onstop = null;
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [refreshStatus]);

  // Click outside to close autocomplete
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modal display for transcript review
  useEffect(() => {
    if (review && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
    if (!review && dialogRef.current?.open) {
      dialogRef.current?.close();
    }
  }, [review]);

  const handleSelect = (airport: Airport) => {
    setQuery(`${airport.iata} — ${airport.city}`);
    setIsOpen(false);
    onSelectAirport(airport);
  };

  function apply(event: AnalysisEvent) {
    if (!event.result) return;
    onResult(event.result);
    const f = event.result.selected_flight;
    const key = f ? `${f.origin_iata}/${f.dest_iata}/${f.scheduled_departure}` : "";
    if (key && key !== lastFlight.current) {
      lastFlight.current = key;
      onResolved(event.result);
    }
    setMessage(
      event.done
        ? event.result.error
          ? "Analysis needs attention."
          : ""
        : "Flight found. Checking historical delay metrics and weather…"
    );
  }

  async function analyze(transcript: string, token?: string) {
    if (!transcript.trim()) {
      setError("Enter an airport, route, date or departure time.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("Finding flight and querying historical delays…");
    setConfirmed(transcript);
    onResult(null);
    lastFlight.current = "";
    onAnalyzeStart?.();

    requestAbort.current = new AbortController();
    try {
      const response = await checked(
        await fetch("/api/concierge/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, review_token: token }),
          signal: requestAbort.current.signal,
        })
      );
      if (!response.body) throw new Error("No analysis stream received.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      let complete = false;

      const consume = (line: string) => {
        if (line.trim()) {
          const event = JSON.parse(line) as AnalysisEvent;
          apply(event);
          complete ||= event.done;
        }
      };

      while (true) {
        const part = await reader.read();
        pending += decoder.decode(part.value, { stream: !part.done });
        const lines = pending.split("\n");
        pending = lines.pop() || "";
        lines.forEach(consume);
        if (part.done) break;
      }
      consume(pending);
      if (!complete) {
        throw new Error(
          "The connection ended before analysis finished. Any partial results remain visible."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setBusy(false);
      requestAbort.current = null;
      void refreshStatus();
    }
  }

  async function transcribe(blob: Blob) {
    setBusy(true);
    setError("");
    onResult(null);
    setConfirmed("");
    setMessage("Transcribing speech locally with Bark model…");
    try {
      const body = new FormData();
      body.append("audio", await toWav(blob), "request.wav");
      const item: Review = await (
        await checked(await fetch("/api/concierge/transcribe", { method: "POST", body }))
      ).json();
      setReview(item);
      setReviewText(item.transcript);
      setMessage(`Transcribed in ${item.speech_time_s}s. Review before flight lookup.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not transcribe audio. Try a shorter recording or type your request."
      );
    } finally {
      setBusy(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }

  async function startRecording() {
    setError("");
    onResult(null);
    setConfirmed("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Audio recording is not supported in this browser. Upload audio or type your request.");
      }
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream.current);
      recorder.current = media;
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      media.onstop = () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        if (timer.current) clearTimeout(timer.current);
        setRecording(false);
        void transcribe(new Blob(chunks, { type: media.mimeType }));
      };
      media.start();
      setRecording(true);
      setMessage("Listening… click microphone or Stop & Review when finished.");
      timer.current = setTimeout(() => {
        if (media.state === "recording") media.stop();
      }, 120000);
    } catch (err) {
      stream.current?.getTracks().forEach((track) => track.stop());
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access was denied. Enable mic permissions in browser or type your request."
          : err instanceof Error
            ? err.message
            : "Microphone access failed. Upload audio or type your request."
      );
    }
  }

  const handleMicClick = () => {
    if (recording) {
      recorder.current?.stop();
    } else {
      if (!voiceReady) {
        return;
      }
      void startRecording();
    }
  };


  function rejectReview() {
    if (review) {
      void fetch(`/api/concierge/review/${encodeURIComponent(review.review_token)}`, {
        method: "DELETE",
      });
    }
    setReview(null);
    setReviewText("");
    setMessage("Review canceled. Record again or type your request.");
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isOpen && filteredAirports.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % filteredAirports.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev - 1 + filteredAirports.length) % filteredAirports.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredAirports[highlightIndex]) {
          handleSelect(filteredAirports[highlightIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      setIsOpen(false);
      if (query.trim()) {
        void analyze(query);
      }
    }
  };

  const voiceReady = status?.voice.phase === "ready";
  const airportSuggestion = airportTranscriptSuggestion(reviewText);
  const isRateLimited = status?.usage?.includes("50 / 50 requests") ?? false;

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto relative z-40">
      {/* 1. Pill Search Bar Input */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-400/40 via-amber-400/30 to-blue-600/40 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition duration-500" />

        <div
          className={`relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl border-2 ${
            recording
              ? "border-rose-400 ring-4 ring-rose-300/30"
              : "border-sky-200/80 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-400/20"
          } shadow-2xl overflow-hidden transition-all duration-300`}
        >
          <div className="pl-5 pr-3 text-sky-600 flex items-center justify-center pointer-events-none">
            {busy ? (
              <LoaderCircle className="w-6 h-6 animate-spin text-sky-600" />
            ) : (
              <Search className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={busy}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightIndex(0);
            }}
            onFocus={() => {
              if (query.trim().length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              recording
                ? "Listening to your request…"
                : "Search airports (ATL, JFK) or type trip (ATL to ZRH tomorrow)…"
            }
            aria-label="Search airports or enter travel request"
            className="w-full py-4 md:py-5 pr-3 text-slate-900 placeholder:text-slate-400 font-medium text-base md:text-lg bg-transparent focus:outline-none"
          />

          <div className="flex items-center gap-1.5 pr-3.5 flex-shrink-0">
            {query && !busy && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Clear search"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleMicClick}
              disabled={busy && !recording}
              aria-label={recording ? "Stop listening" : "Start voice input"}
              title={
                recording
                  ? "Click to stop listening"
                  : voiceReady
                    ? "Speak your trip with local voice concierge"
                    : "Voice engine warming up or unavailable"
              }
              className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
                recording
                  ? "bg-rose-600 text-white animate-pulse shadow-md"
                  : voiceReady
                    ? "text-sky-600 hover:bg-sky-50 active:scale-95"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              {recording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && filteredAirports.length > 0 && (
        <div className="absolute top-16 md:top-20 left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-sky-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Global Airway Hubs ({filteredAirports.length})</span>
            <span className="text-[11px] font-normal text-slate-400">Select to load destination</span>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredAirports.map((airport, idx) => (
              <li
                key={airport.iata}
                onClick={() => handleSelect(airport)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                  highlightIndex === idx ? "bg-sky-50 text-sky-950" : "hover:bg-slate-50 text-slate-800"
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-10 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-sm tracking-wider shadow-sm flex-shrink-0">
                    {airport.iata}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 text-sm leading-snug">
                      {airport.city}, <span className="text-slate-600 font-normal">{airport.country}</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[260px] sm:max-w-md">
                      {airport.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-right">
                  <span className="hidden sm:inline-block text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {airport.timezone}
                  </span>
                  <ChevronRight className="w-4 h-4 text-sky-600" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Helper & Status Row */}
      <div className="mt-3 px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <p className="text-slate-600 text-[12px] leading-relaxed">
          Include origin, destination, day and approximate departure time. Audio stays on your laptop.
        </p>
        {voiceReady && (
          <span className="self-start sm:self-auto px-2.5 py-1 rounded-full font-semibold border text-[11px] whitespace-nowrap shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200">
            Voice ready · {status?.voice.device || "local"}
          </span>
        )}
      </div>

      {/* Groq Usage Line */}
      {status?.usage && (
        <div className="mt-1 px-1 text-[11px] text-slate-500 font-mono">
          {status.usage}
        </div>
      )}

      {/* Missing settings alert */}
      {status?.missing_settings && status.missing_settings.length > 0 && (
        <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200">
          Live setup incomplete: {status.missing_settings.join(", ")}. The debug demo uses no credentials.
        </p>
      )}

      {/* Rate limit warning */}
      {isRateLimited && (
        <p role="alert" className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 font-semibold">
          Daily Groq request allowance reached (50/50). Local voice input and direct route lookups remain available.
        </p>
      )}

      {/* 3. Action Buttons */}
      <div className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
        {recording ? (
          <button
            type="button"
            onClick={() => recorder.current?.stop()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer animate-pulse"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop & review
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || !voiceReady}
            onClick={() => void startRecording()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Mic className="w-4 h-4" />
            Record request
          </button>
        )}

        <button
          type="button"
          disabled={busy || recording || !voiceReady}
          onClick={() => uploadInputRef.current?.click()}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/90 hover:bg-white text-sky-900 border border-sky-200/90 font-bold text-sm shadow-2xs hover:border-sky-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4 text-sky-600" />
          Upload audio
        </button>
        <input
          ref={uploadInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          aria-label="Upload travel audio"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void transcribe(file);
          }}
        />
      </div>


      {/* Inline Feedback Messages */}
      {message && (
        <div role="status" aria-live="polite" className="mt-2.5 px-1 text-xs text-sky-800 font-medium flex items-center gap-1.5">
          {busy && <LoaderCircle className="w-3.5 h-3.5 animate-spin text-sky-600" />}
          <span>{message}</span>
        </div>
      )}
      {error && (
        <p role="alert" aria-live="assertive" className="mt-2.5 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
          {error}
        </p>
      )}

      {/* Debug Demo Fixture Button */}
      {status?.demo_available && (
        <div className="mt-2 flex justify-center">
          <DebugDemoButton
            disabled={busy || recording}
            onResult={(event) => {
              setConfirmed(event.transcript);
              setError("");
              apply(event);
              setMessage("Debug demo loaded (JFK ➔ LHR). No API calls made.");
            }}
          />
        </div>
      )}


      {/* 5. Transcript Confirmation / Edit Dialog */}
      <dialog
        ref={dialogRef}
        aria-labelledby="transcript-title"
        onCancel={(event) => event.preventDefault()}
        className="m-auto w-[min(92vw,640px)] rounded-2xl border border-sky-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm"
      >
        <h2 id="transcript-title" className="text-2xl sm:text-3xl font-bold">
          Is this correct?
        </h2>
        <p className="my-2.5 text-sm sm:text-base text-slate-600">
          Edit anything Bark misheard. We’ll analyze exactly the text below when you choose Yes.
        </p>
        <label htmlFor="reviewed-transcript" className="text-xs sm:text-sm font-bold text-slate-700 block">
          Your transcript · click to edit
        </label>
        <textarea
          id="reviewed-transcript"
          autoFocus
          className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          rows={4}
          maxLength={6000}
          value={reviewText}
          onChange={(event) => setReviewText(event.target.value)}
        />
        {airportSuggestion && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800">
          <p>Heard “{airportSuggestion.heard}”. Did you mean JFK (John F. Kennedy, New York)? Missing letters can be ambiguous.</p>
          <button type="button" disabled={busy} onClick={() => setReviewText(airportSuggestion.corrected)} className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold">Use JFK in transcript</button>
        </div>}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 px-4 py-3 font-bold text-white transition-colors disabled:opacity-50 cursor-pointer"
            disabled={!reviewText.trim() || busy}
            onClick={() => {
              const token = review?.review_token;
              setReview(null);
              void analyze(reviewText, token);
            }}
          >
            Yes, analyze this request
          </button>
          <button
            type="button"
            onClick={rejectReview}
            className="rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-3 font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            No, record again
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">No flight search, Groq call or Snowflake query starts before Yes.</p>
      </dialog>
    </div>
  );
}
