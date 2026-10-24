import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAirportTerminals, findAirportTerminal, distanceToTerminal, loadAirportTerminals } from '../standby-app/src/lib/airport-terminals.ts';
import { loadAirportGates } from '../standby-app/src/lib/airport-gates.ts';

const rectangle = (west, south, east, north) => [
  { lon: west, lat: south }, { lon: east, lat: south },
  { lon: east, lat: north }, { lon: west, lat: north }, { lon: west, lat: south },
];
const ring = rectangle(-73.79, 40.64, -73.78, 40.65);
const building = { type: 'way', id: 8, tags: { aeroway: 'terminal', name: 'JFK Terminal 8 (American Airlines)' }, geometry: ring };

test('terminal footprint retains exact extent and matches equivalent terminal input without matching terminal 80', () => {
  const terminals = parseAirportTerminals({ elements: [building] });
  assert.deepEqual(terminals[0].properties.bounds, [-73.79, 40.64, -73.78, 40.65]);
  for (const name of ['8', 'T8', 'Terminal 8']) assert.equal(findAirportTerminal(terminals, name)?.id, 'way/8');
  assert.equal(findAirportTerminal(terminals, '80'), undefined);
});

test('real JFK and Heathrow terminal snapshots match the demo route without any external request', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Bundled data must not request the network'); };
  try {
    for (const [code, ref] of [['JFK', '8'], ['LHR', '5']]) {
      const terminals = await loadAirportTerminals(code);
      const terminal = findAirportTerminal(terminals, ref);
      assert.ok(terminal, `${code} terminal ${ref} must match`);
      assert.notEqual(terminal.geometry.type, 'Point');
      const gates = await loadAirportGates(code, '');
      assert.ok(gates.features.length > 20);
    }
    const jfk = await loadAirportGates('JFK', 'B22');
    assert.ok(jfk.features.some(feature => feature.properties.ref === 'B22'));
  } finally { globalThis.fetch = previousFetch; }
});

test('split multipolygon walls are joined, inner courtyards excluded, and duplicate member ways removed', () => {
  const relation = { type: 'relation', id: 88, tags: { aeroway: 'terminal', ref: '8' }, members: [
    { type: 'way', ref: 8, role: 'outer', geometry: ring.slice(0, 3) },
    { type: 'way', ref: 9, role: 'outer', geometry: ring.slice(2).reverse() },
    { type: 'way', ref: 10, role: 'inner', geometry: rectangle(-73.787, 40.643, -73.783, 40.647) },
  ] };
  const terminals = parseAirportTerminals({ elements: [building, relation] });
  assert.equal(terminals.length, 1);
  assert.equal(terminals[0].geometry.type, 'MultiPolygon');
  assert.equal(terminals[0].geometry.coordinates[0].length, 2);
  assert.equal(distanceToTerminal([-73.789, 40.641], terminals[0]), 0);
  assert.ok(distanceToTerminal([-73.785, 40.645], terminals[0]) > 100);
  assert.ok(distanceToTerminal([-73.7799, 40.645], terminals[0]) < 15);
});

test('ambiguous terminal references and incomplete geometry never produce an invented footprint', () => {
  const other = { ...building, id: 9, geometry: rectangle(-73.77, 40.64, -73.76, 40.65) };
  assert.equal(findAirportTerminal(parseAirportTerminals({ elements: [building, other] }), '8'), undefined);
  assert.equal(parseAirportTerminals({ elements: [{ ...building, geometry: ring.slice(0, 3) }] }).length, 0);
  assert.throws(() => parseAirportTerminals({ elements: [], remark: 'runtime error: timed out' }));
});

test('terminal geometry upgrades the old cache once and concurrent/repeated lookups make no extra requests', async () => {
  const storage = new Map([['airport_terminals_CACHE_TEST', JSON.stringify([{ longitude: 0, latitude: 0, ref: '8' }])]]);
  const previousFetch = globalThis.fetch, previousStorage = globalThis.localStorage;
  let calls = 0;
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.fetch = async (url) => {
    calls++;
    assert.equal(url, '/api/concierge/airport-map/CACHE_TEST');
    return { ok: true, json: async () => ({ elements: [building] }) };
  };
  try {
    const [first, simultaneous] = await Promise.all([
      loadAirportTerminals('CACHE_TEST'), loadAirportTerminals('CACHE_TEST'),
    ]);
    assert.equal(first[0].id, simultaneous[0].id);
    assert.equal(storage.has('airport_terminal_geometry_v2_CACHE_TEST'), true);
    await loadAirportTerminals('CACHE_TEST');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    globalThis.standbyTerminalGeometryRequests?.delete('CACHE_TEST');
    globalThis.standbyAirportMapData?.delete('CACHE_TEST');
  }
});
