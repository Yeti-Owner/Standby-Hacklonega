import type { FeatureCollection, Point } from "geojson";

type GateNode = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: { aeroway?: string; ref?: string };
};
type GateResponse = { elements: GateNode[]; remark?: string };
export type AirportGates = FeatureCollection<Point, { ref: string }>;

// Survives hot reloads and shares one request between concurrent mounts,
// including React Strict Mode. Successful responses remain in memory when
// localStorage is unavailable; no automatic retry loop contacts Overpass.
const shared = globalThis as typeof globalThis & {
  standbyAirportGateRequests?: Map<string, Promise<GateResponse>>;
};
const requests = shared.standbyAirportGateRequests ??= new Map();

function validResponse(value: unknown): value is GateResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as GateResponse;
  return Array.isArray(data.elements) && !data.remark && data.elements.every(node =>
    node && node.type === "node" && Number.isFinite(node.id) &&
    Number.isFinite(node.lat) && Math.abs(node.lat) <= 90 &&
    Number.isFinite(node.lon) && Math.abs(node.lon) <= 180 &&
    (node.tags?.ref === undefined || typeof node.tags.ref === "string"));
}

function readCache(key: string): GateResponse | undefined {
  try {
    const raw = localStorage.getItem(key);
    const data: unknown = raw ? JSON.parse(raw) : undefined;
    if (validResponse(data)) return data;
  } catch { /* Blocked storage or corrupt cache: use memory/network instead. */ }
}

function writeCache(key: string, data: GateResponse) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* Private browsing / storage limits must not prevent rendering. */ }
}

export async function loadAirportGates(
  airportCode: string,
  gate: string,
  [longitude, latitude]: readonly [number, number],
): Promise<AirportGates> {
  const code = airportCode.trim().toUpperCase();
  const ref = gate.trim().toUpperCase();
  const airportKey = `airport_gates_${code}`;
  const gateKey = ref ? `airport_gate_${code}_${ref}` : airportKey;
  let data = readCache(gateKey) ?? readCache(airportKey);

  if (!data) {
    let pending = requests.get(code);
    if (!pending) {
      pending = (async () => {
        const query = `[out:json][timeout:10];node["aeroway"="gate"](around:4000,${latitude},${longitude});out body;`;
        const response = await fetch("https://overpass.private.coffee/api/interpreter", {
          method: "POST",
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error("Gate lookup unavailable.");
        const result: unknown = await response.json();
        // Never permanently cache errors or partial timeout responses.
        if (!validResponse(result)) throw new Error("Incomplete gate response.");
        writeCache(airportKey, result);
        return result;
      })();
      requests.set(code, pending);
      void pending.catch(() => { requests.delete(code); });
    }
    data = await pending;
  }
  if (!data) throw new Error("Gate response unavailable.");

  // Both keys contain the complete airport response, with no automatic expiry.
  writeCache(airportKey, data);
  writeCache(gateKey, data);
  return {
    type: "FeatureCollection",
    features: data.elements.filter(node => node.tags?.ref?.trim()).map(node => ({
      type: "Feature",
      id: node.id,
      properties: { ref: node.tags!.ref!.trim() },
      geometry: { type: "Point", coordinates: [node.lon, node.lat] },
    })),
  };
}
