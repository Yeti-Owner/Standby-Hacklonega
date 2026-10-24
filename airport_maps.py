"""Public airport geometry only: no flight-provider, AI, or Snowflake calls."""
import json
from pathlib import Path
import threading
import time

import requests

ROOT = Path(__file__).resolve().parent
CENTERS = {
    'ATL': (-84.432, 33.6407), 'LAX': (-118.4037, 33.9435),
    'JFK': (-73.7806, 40.6446), 'ORD': (-87.9048, 41.9786),
    'DFW': (-97.0403, 32.8998), 'DEN': (-104.6737, 39.8617),
    'SFO': (-122.386, 37.6165), 'SEA': (-122.3088, 47.4436),
    'HND': (139.7845, 35.5505), 'LHR': (-0.4496, 51.4707),
}
_LOCKS = {code: threading.Lock() for code in CENTERS}
_FAILURES = {}


def valid_payload(data):
    return isinstance(data, dict) and isinstance(data.get('elements'), list) and not data.get('remark')


def airport_map_data(code):
    code = code.strip().upper()
    if code not in CENTERS:
        raise ValueError('Airport map not supported.')
    # Real OSM extracts are bundled for the presentation route. No live lookup
    # is needed, and a remote outage cannot hide these terminal/gate features.
    snapshot = ROOT / 'standby-app' / 'src' / 'data' / 'airport-maps' / f'{code}.json'
    if snapshot.exists():
        data = json.loads(snapshot.read_text(encoding='utf-8'))
        if valid_payload(data):
            return {**data, 'map_source': 'bundled_osm_snapshot'}

    with _LOCKS[code]:
        cache = ROOT / '.cache' / 'airport-maps' / f'{code}.json'
        try:
            data = json.loads(cache.read_text(encoding='utf-8'))
            if valid_payload(data):
                return data
        except (OSError, ValueError):
            pass
        if time.monotonic() - _FAILURES.get(code, -float('inf')) < 60:
            raise RuntimeError('Map service is temporarily unavailable. Try again in a minute.')
        longitude, latitude = CENTERS[code]
        query = (f'[out:json][timeout:3];('
                 f'node["aeroway"="gate"](around:4000,{latitude},{longitude});'
                 f'nwr["aeroway"="terminal"](around:4000,{latitude},{longitude}););out geom;')
        # One combined lookup serves both gates and terminal outlines. A public
        # fallback is bounded, and failed airports get a one-minute cooldown.
        for endpoint in ('https://overpass.private.coffee/api/interpreter',
                         'https://overpass-api.de/api/interpreter'):
            try:
                response = requests.post(endpoint, data={'data': query}, timeout=(1, 3))
                response.raise_for_status()
                data = response.json()
                if not valid_payload(data):
                    continue
                data['map_source'] = 'overpass'
                try:
                    cache.parent.mkdir(parents=True, exist_ok=True)
                    cache.write_text(json.dumps(data), encoding='utf-8')
                except OSError:
                    pass
                _FAILURES.pop(code, None)
                return data
            except (requests.RequestException, ValueError):
                continue
        _FAILURES[code] = time.monotonic()
        raise RuntimeError('Map services did not respond. Try again in a minute.')
