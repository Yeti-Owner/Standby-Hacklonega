type Terminal = { longitude: number; latitude: number; ref?: string; name?: string };

const shared = globalThis as typeof globalThis & {
  standbyTerminalRequests?: Map<string, Promise<Terminal[]>>;
};
const requests = shared.standbyTerminalRequests ??= new Map();

function isTerminal(value: unknown): value is Terminal {
  if (!value || typeof value !== "object") return false;
  const item = value as Terminal;
  return Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180 &&
    Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 &&
    (item.ref === undefined || typeof item.ref === "string") &&
    (item.name === undefined || typeof item.name === "string");
}

// Accept the common equivalent forms "8", "T8", and "Terminal 8".
function terminalRef(value: string) {
  return value.trim().toUpperCase().replace(/^TERMINAL\s*/, "").replace(/^T(?=\d)/, "").replace(/\s+/g, "");
}

export async function locateAirportTerminal(code: string, terminal: string, [longitude, latitude]: readonly [number, number]) {
  const key = `airport_terminals_${code}`;
  let items: Terminal[] | undefined;
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (Array.isArray(cached) && cached.every(isTerminal)) items = cached;
  } catch { /* Storage is optional. Existing gate caches remain untouched. */ }

  if (!items) {
    let pending = requests.get(code);
    if (!pending) {
      pending = (async () => {
        const query = `[out:json][timeout:10];nwr["aeroway"="terminal"](around:4000,${latitude},${longitude});out center;`;
        const response = await fetch("https://overpass.private.coffee/api/interpreter", {
          method: "POST", body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error("Terminal lookup unavailable.");
        const data = await response.json() as {
          remark?: string;
          elements?: { lon?: number; lat?: number; center?: { lon: number; lat: number }; tags?: { ref?: string; name?: string } }[];
        };
        if (!data || data.remark || !Array.isArray(data.elements)) throw new Error("Incomplete terminal response.");
        const terminals = data.elements.map(item => ({
          longitude: item.center?.lon ?? item.lon,
          latitude: item.center?.lat ?? item.lat,
          ref: item.tags?.ref,
          name: item.tags?.name,
        })).filter(isTerminal);
        try { localStorage.setItem(key, JSON.stringify(terminals)); } catch { /* Use memory instead. */ }
        return terminals;
      })();
      requests.set(code, pending);
      void pending.catch(() => requests.delete(code));
    }
    items = await pending;
  }
  const wanted = terminalRef(terminal);
  const matches = items?.filter(item => [item.ref, item.name].some(value => value && terminalRef(value) === wanted));
  // Ambiguous names retain the airport overview rather than inventing a location.
  return matches?.length === 1 ? matches[0] : undefined;
}
