"use client";
import { useState } from "react";
import { checked, type AnalysisEvent } from "@/lib/concierge";

/** Explicit sample data for trying the app without live service credentials. */
export default function DemoButton({ disabled, onResult }: { disabled: boolean; onResult: (event: AnalysisEvent) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return <div className="mt-4 border-t border-dashed border-amber-300 pt-3"><button type="button" disabled={disabled || loading} onClick={async () => {
    setLoading(true); setError("");
    try { onResult(await (await checked(await fetch("/api/concierge/demo", { cache: "no-store" }))).json()); }
    catch { setError("Start the app with start.bat to load the sample flight."); }
    finally { setLoading(false); }
  }} className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950 disabled:opacity-50">{loading ? "Loading sample…" : "Try a sample flight: JFK → Heathrow (demo data)"}</button>{error && <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>}</div>;
}
