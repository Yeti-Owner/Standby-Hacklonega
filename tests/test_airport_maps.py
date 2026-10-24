"""Focused map-service checks; no model, paid services, or external requests."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import airport_maps


class AirportMapTests(unittest.TestCase):
    def test_bundled_demo_route_needs_no_network(self):
        with patch.object(airport_maps.requests, 'post', side_effect=AssertionError('No network for bundled maps')):
            for code, terminal in [('JFK', 'Terminal 8'), ('LHR', 'Heathrow Terminal 5')]:
                data = airport_maps.airport_map_data(code)
                self.assertEqual(data['map_source'], 'bundled_osm_snapshot')
                self.assertTrue(any(e.get('tags', {}).get('name') == terminal for e in data['elements']))
                self.assertTrue(any(e.get('tags', {}).get('aeroway') == 'gate' for e in data['elements']))

    def test_shared_disk_cache_and_bounded_public_fallback(self):
        raw = {'elements': []}
        response = Mock()
        response.json.return_value = raw
        with tempfile.TemporaryDirectory() as folder, patch.object(airport_maps, 'ROOT', Path(folder)), patch.object(
            airport_maps.requests, 'post', side_effect=[airport_maps.requests.Timeout(), response]
        ) as post:
            airport_maps._FAILURES.pop('ATL', None)
            self.assertEqual(airport_maps.airport_map_data('ATL')['elements'], [])
            self.assertEqual(post.call_count, 2)
            self.assertEqual(post.call_args.kwargs['timeout'], (1, 3))
            airport_maps.airport_map_data('ATL')
            self.assertEqual(post.call_count, 2)
            cache = Path(folder) / '.cache/airport-maps/ATL.json'
            self.assertEqual(json.loads(cache.read_text())['map_source'], 'overpass')


if __name__ == '__main__':
    unittest.main()
