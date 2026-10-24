"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const AirportGateMap = dynamic(() => import("@/components/AirportGateMap"), {
  ssr: false,
  loading: () => <p className="flex h-80 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-600">Loading terminal map…</p>,
});

export default function AirportMapCard({ airportCode, gate, terminal, side }: { airportCode: string; gate?: string | null; terminal?: string | null; side: "departure" | "arrival" }) {
  const [activeGate, setActiveGate] = useState(gate?.trim().toUpperCase() || "");
  const [draftGate, setDraftGate] = useState(activeGate);
  const [activeTerminal, setActiveTerminal] = useState(terminal?.trim() || "");
  const [draftTerminal, setDraftTerminal] = useState(activeTerminal);
  return <article>
    <h4 className="mb-2 text-sm font-bold text-slate-700">{side === "departure" ? "Departure" : "Arrival"} · {airportCode}{activeTerminal && ` · Terminal ${activeTerminal}`}{activeGate && ` · Gate ${activeGate}`}</h4>
    {!gate?.trim() && <p className="mb-3 text-xs text-slate-600">The flight search did not provide a gate. A known terminal shows an approximate terminal view. You can enter a terminal or gate from your boarding pass or airline app below.</p>}
    <form className="mb-3 flex flex-wrap items-end gap-2" onSubmit={event => {
      event.preventDefault();
      setActiveGate(draftGate.trim().toUpperCase());
      setActiveTerminal(draftTerminal.trim());
    }}>
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Terminal at {airportCode}
        <input value={draftTerminal} onChange={event => setDraftTerminal(event.target.value)} maxLength={40} placeholder="e.g. 8" className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Gate at {airportCode}
        <input value={draftGate} onChange={event => setDraftGate(event.target.value)} maxLength={20} placeholder="e.g. B22" autoCapitalize="characters" className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-2" />
      </label>
      <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">{draftGate.trim() ? "Show gate" : draftTerminal.trim() ? "Show terminal" : "Show airport"}</button>
    </form>
    <AirportGateMap airportCode={airportCode} gate={activeGate} terminal={activeTerminal} />
  </article>;
}
