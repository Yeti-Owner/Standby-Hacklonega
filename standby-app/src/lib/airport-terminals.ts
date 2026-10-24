import type { Feature, MultiPolygon, Point, Polygon, Position } from "geojson";
import { airportMapSnapshotDate, loadAirportMapData } from "./airport-map-data.ts";

export type Terminal = Feature<Polygon | MultiPolygon | Point, {
  ref: string;
  name: string;
  bounds: [number, number, number, number];
}>;
type Coordinate = { lon: number; lat: number };
type Element = {
  type: "node" | "way" | "relation";
  id: number;
  lon?: number;
  lat?: number;
  tags?: Record<string, string>;
  geometry?: Coordinate[];
  members?: { type: string; ref: number; role: string; geometry?: Coordinate[] }[];
};
type TerminalResponse = { elements: Element[]; remark?: string };

const shared = globalThis as typeof globalThis & {
  standbyTerminalGeometryRequests?: Map<string, Promise<Terminal[]>>;
};
const requests = shared.standbyTerminalGeometryRequests ??= new Map();
const samePoint = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];
const validPoint = (point: Coordinate) => point && Number.isFinite(point.lon) && Math.abs(point.lon) <= 180 && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90;

// Relations can split a perimeter across ways. Join shared endpoints without
// closing missing segments artificially.
function assembleRings(segments: Coordinate[][]): Position[][] {
  const remaining = segments.filter(segment => segment.length >= 2 && segment.every(validPoint))
    .map(segment => segment.map(point => [point.lon, point.lat]));
  const rings: Position[][] = [];
  while (remaining.length) {
    const ring = remaining.shift()!;
    while (!samePoint(ring[0], ring[ring.length - 1])) {
      const end = ring[ring.length - 1];
      const index = remaining.findIndex(segment => samePoint(segment[0], end) || samePoint(segment[segment.length - 1], end));
      if (index < 0) break;
      const segment = remaining.splice(index, 1)[0];
      if (!samePoint(segment[0], end)) segment.reverse();
      ring.push(...segment.slice(1));
    }
    if (ring.length >= 4 && samePoint(ring[0], ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

function insideRing([x, y]: Position, ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygons(terminal: Terminal): Position[][][] {
  return terminal.geometry.type === "Polygon" ? [terminal.geometry.coordinates]
    : terminal.geometry.type === "MultiPolygon" ? terminal.geometry.coordinates : [];
}

// Distance to actual walls, including holes. Gates may be just outside a wall.
export function distanceToTerminal(point: Position, terminal: Terminal): number {
  const shapes = polygons(terminal);
  if (shapes.some(rings => insideRing(point, rings[0]) && !rings.slice(1).some(ring => insideRing(point, ring)))) return 0;
  const scaleX = 111320 * Math.cos(point[1] * Math.PI / 180), scaleY = 111320;
  const distance = (a: Position, b: Position) => {
    const ax = (a[0] - point[0]) * scaleX, ay = (a[1] - point[1]) * scaleY;
    const dx = (b[0] - a[0]) * scaleX, dy = (b[1] - a[1]) * scaleY;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(ax + t * dx, ay + t * dy);
  };
  if (terminal.geometry.type === "Point") return distance(terminal.geometry.coordinates, terminal.geometry.coordinates);
  let nearest = Infinity;
  for (const rings of shapes) for (const ring of rings) for (let i = 1; i < ring.length; i++) nearest = Math.min(nearest, distance(ring[i - 1], ring[i]));
  return nearest;
}

export function parseAirportTerminals(value: unknown): Terminal[] {
  const data = value as TerminalResponse | null;
  if (!data || data.remark || !Array.isArray(data.elements)) throw new Error("Incomplete terminal response.");
  const terminals: Terminal[] = [];
  const representedWays = new Set<number>();
  for (const item of data.elements) {
    if (!item || !Number.isFinite(item.id) || item.tags?.aeroway !== "terminal") continue;
    let geometry: Terminal["geometry"] | undefined;
    if (item.type === "node" && validPoint(item as Coordinate)) geometry = { type: "Point", coordinates: [item.lon!, item.lat!] };
    if (item.type === "way" && item.geometry) {
      const rings = assembleRings([item.geometry]);
      if (rings.length) geometry = { type: "Polygon", coordinates: rings };
    }
    if (item.type === "relation" && item.members) {
      const outer = assembleRings(item.members.filter(member => member.role === "outer" || member.role === "").map(member => member.geometry ?? []));
      const inner = assembleRings(item.members.filter(member => member.role === "inner").map(member => member.geometry ?? []));
      if (outer.length) {
        geometry = { type: "MultiPolygon", coordinates: outer.map(ring => [ring, ...inner.filter(hole => insideRing(hole[0], ring))]) };
        item.members.filter(member => member.type === "way").forEach(member => representedWays.add(member.ref));
      }
    }
    if (!geometry) continue;
    const points = geometry.type === "Point" ? [geometry.coordinates]
      : geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    terminals.push({
      type: "Feature", id: `${item.type}/${item.id}`, geometry,
      properties: {
        ref: item.tags.ref ?? "", name: item.tags["name:en"] ?? item.tags.name ?? "",
        bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      },
    });
  }
  return terminals.filter(terminal => !String(terminal.id).startsWith("way/") || !representedWays.has(Number(String(terminal.id).slice(4))));
}

export function normalizeTerminal(value: string) {
  return value.trim().toUpperCase().replace(/^(?:TERMINAL|CONCOURSE)\s*/, "").replace(/^T(?=\d)/, "").replace(/[\s.-]+/g, "");
}

export function findAirportTerminal(terminals: Terminal[], label: string): Terminal | undefined {
  const wanted = normalizeTerminal(label);
  if (!wanted) return undefined;
  const matches = terminals.filter(item => [item.properties.ref, item.properties.name].some(value => {
    const identifier = /\b(?:TERMINAL|CONCOURSE)\s*([0-9]+[A-Z]?|[A-Z])\b/i.exec(value)?.[1];
    return normalizeTerminal(value) === wanted || (identifier && normalizeTerminal(identifier) === wanted);
  }));
  const footprints = matches.filter(item => item.geometry.type !== "Point");
  const candidates = footprints.length ? footprints : matches;
  return candidates.length === 1 ? candidates[0] : undefined;
}

export async function loadAirportTerminals(code: string): Promise<Terminal[]> {
  // Automatically replace the old center-only schema, without clearing gates.
  const key = `airport_terminal_geometry_v2_${code}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached && !airportMapSnapshotDate(code)) return parseAirportTerminals(JSON.parse(cached));
  } catch { /* Corrupt or unavailable storage: share one live request. */ }
  let pending = requests.get(code);
  if (!pending) {
    pending = (async () => {
      const raw: unknown = await loadAirportMapData(code);
      const terminals = parseAirportTerminals(raw);
      try { localStorage.setItem(key, JSON.stringify(raw)); } catch { /* Use memory instead. */ }
      return terminals;
    })();
    requests.set(code, pending);
    void pending.catch(() => requests.delete(code));
  }
  return pending;
}
