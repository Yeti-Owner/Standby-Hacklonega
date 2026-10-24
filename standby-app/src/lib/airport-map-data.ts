import jfk from "../data/airport-maps/JFK.json" with { type: "json" };
import lhr from "../data/airport-maps/LHR.json" with { type: "json" };

const snapshots: Record<string, unknown> = { JFK: jfk, LHR: lhr };
const shared = globalThis as typeof globalThis & {
  standbyAirportMapData?: Map<string, Promise<unknown>>;
  standbyAirportMapFailures?: Map<string, number>;
};
const requests = shared.standbyAirportMapData ??= new Map();
const failures = shared.standbyAirportMapFailures ??= new Map();

export function airportMapSnapshotDate(code: string) {
  const snapshot = snapshots[code] as { snapshot_date?: string } | undefined;
  return snapshot?.snapshot_date;
}

// Bundled demo-route geometry renders immediately, even if Overpass is down.
// Other airports use one same-origin backend request shared by both loaders.
export async function loadAirportMapData(code: string): Promise<unknown> {
  if (Object.hasOwn(snapshots, code)) return snapshots[code];
  if (Date.now() - (failures.get(code) ?? 0) < 60000) throw new Error("Map service temporarily unavailable.");
  let pending = requests.get(code);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(`/api/concierge/airport-map/${encodeURIComponent(code)}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Airport map service unavailable.");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !Array.isArray((data as { elements?: unknown }).elements) || "remark" in data) throw new Error("Incomplete map response.");
      return data;
    })();
    requests.set(code, pending);
    void pending.catch(() => { requests.delete(code); failures.set(code, Date.now()); });
  }
  return pending;
}
