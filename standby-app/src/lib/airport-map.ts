// Terminal-area centers, [longitude, latitude]. No geocoding requests are needed.
// These are airport overview points, not surveyed gate locations.
export const AIRPORT_TERMINAL_COORDINATES: Readonly<Record<string, readonly [number, number]>> = {
  ATL: [-84.432, 33.6407],
  LAX: [-118.4037, 33.9435],
  JFK: [-73.7806, 40.6446],
  ORD: [-87.9048, 41.9786],
  DFW: [-97.0403, 32.8998],
  DEN: [-104.6737, 39.8617],
  SFO: [-122.386, 37.6165],
  SEA: [-122.3088, 47.4436],
  HND: [139.7845, 35.5505],
  LHR: [-0.4496, 51.4707],
};

export const AIRPORT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export function airportTerminalCoordinates(airportCode: string) {
  const code = airportCode.trim().toUpperCase();
  return Object.hasOwn(AIRPORT_TERMINAL_COORDINATES, code)
    ? AIRPORT_TERMINAL_COORDINATES[code]
    : undefined;
}
