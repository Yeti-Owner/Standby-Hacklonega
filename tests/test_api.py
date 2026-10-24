"""Offline integration tests: no paid APIs, model warmup, or credential changes."""
import io
import json
import os
from pathlib import Path
import struct
import sys
import threading
import time
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import api
import app as engine


def wav():
    data=b'\0\0'*160
    return b'RIFF'+struct.pack('<I',36+len(data))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,1,1,16000,32000,2,16)+b'data'+struct.pack('<I',len(data))+data


class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.patches=[patch.dict(os.environ,{'STANDBY_SKIP_ASR_PRELOAD':'1'}),
            patch('requests.sessions.Session.request',side_effect=AssertionError('External network forbidden in offline tests')),
            patch('openai.OpenAI',side_effect=AssertionError('Real AI forbidden in offline tests'))]
        for item in self.patches:item.start()
        self.client_context=TestClient(api.api)
        self.client=self.client_context.__enter__()
        engine._CACHE.clear()

    def tearDown(self):
        self.client_context.__exit__(None,None,None)
        for item in reversed(self.patches):item.stop()

    def test_demo_is_explicit_and_costs_nothing(self):
        before=engine._read_groq_usage()
        with patch.object(engine,'run_agent',side_effect=AssertionError('No agent in demo')),patch.object(engine,'query_snowflake_delay_probability',side_effect=AssertionError('No Snowflake in demo')),patch.object(engine,'travel_context',side_effect=AssertionError('No weather in demo')):
            body=self.client.get('/api/demo').json()
        result=body['result']
        self.assertTrue(result['demo']);self.assertEqual(result['schedule_source'],'demo_fixture')
        self.assertEqual(result['selected_flight']['origin_iata'],'JFK');self.assertEqual(result['selected_flight']['dest_iata'],'LHR')
        self.assertEqual(result['request_interpretation']['tool_arguments']['approx_hour_24'],19)
        self.assertEqual(result['delay_probability_pct'],24.0)
        self.assertTrue(result['airline_support']['claim'].startswith('https://www.britishairways.com/'))
        self.assertEqual(before,engine._read_groq_usage())

    def test_voice_requires_review_and_uses_edited_transcript(self):
        phrase=api.DEMO_TRANSCRIPT
        fixture=api.demo_result();fixture.pop('demo');fixture['schedule_source']='serpapi'
        fixture.pop('input_method');fixture.pop('travel_context');fixture.pop('enrichment_status')
        with patch.object(engine,'transcribe_audio',return_value=phrase) as asr,patch.object(engine,'run_agent',return_value=fixture) as agent,patch.object(engine,'travel_context',return_value={}) as weather:
            review=self.client.post('/api/transcribe',files={'audio':('request.wav',wav(),'audio/wav')}).json()
            self.assertEqual(review['transcript'],phrase);self.assertFalse(agent.called);self.assertFalse(weather.called)
            saved=Path(api._REVIEWS[review['review_token']]['path'])
            response=self.client.post('/api/analyze',json={'transcript':'From JFK to Heathrow tomorrow at 8pm','review_token':review['review_token']})
            frames=[json.loads(line) for line in response.text.splitlines()]
            self.assertTrue(frames[-1]['done']);self.assertEqual(frames[-1]['result']['input_method'],'Voice')
            self.assertEqual(agent.call_args.args[0],'From JFK to Heathrow tomorrow at 8pm')
            self.assertEqual(asr.call_count,1);self.assertFalse(saved.exists())
            self.assertEqual(self.client.post('/api/analyze',json={'transcript':phrase,'review_token':review['review_token']}).status_code,410)

    def test_typing_streams_all_backend_fields_and_cache(self):
        fixture=api.demo_result();fixture.pop('demo');fixture.pop('input_method')
        with patch.object(engine,'run_agent',return_value=fixture) as agent,patch.object(engine,'travel_context',return_value=fixture['travel_context']):
            first=self.client.post('/api/analyze',json={'transcript':api.DEMO_TRANSCRIPT})
            frames=[json.loads(line) for line in first.text.splitlines()]
            self.assertGreater(len(frames),1);result=frames[-1]['result']
            for key in ['airline_support','historical','travel_context','snowflake_speed_ms','avg_delay_mins']:
                self.assertIn(key,result)
            self.assertEqual(result['input_method'],'Type')
            self.client.post('/api/analyze',json={'transcript':api.DEMO_TRANSCRIPT})
            self.assertEqual(agent.call_count,1)

    def test_reject_cleans_audio_and_input_safety(self):
        with patch.object(engine,'transcribe_audio',return_value=api.DEMO_TRANSCRIPT):
            review=self.client.post('/api/transcribe',files={'audio':('test.wav',wav(),'audio/wav')}).json()
        saved=Path(api._REVIEWS[review['review_token']]['path'])
        self.client.delete('/api/review/'+review['review_token']);self.assertFalse(saved.exists())
        self.assertEqual(self.client.post('/api/transcribe',files={'audio':('bad.wav',b'not audio','audio/wav')}).status_code,415)
        self.assertEqual(self.client.post('/api/analyze',json={'transcript':' '}).status_code,422)
        self.assertEqual(self.client.post('/api/analyze',json={'transcript':'x'*6001}).status_code,422)
        self.assertEqual(self.client.post('/api/analyze',headers={'Origin':'https://unrelated.example'},json={'transcript':'test'}).status_code,403)

    def test_missing_env_exposes_demo_not_secret_values(self):
        with patch.dict(os.environ,{'GROQ_API_KEY':'','OPENAI_API_KEY':'','SERPAPI_KEY':'','AVIATIONSTACK_API_KEY':'','SNOWFLAKE_ACCOUNT':''}):
            status=self.client.get('/api/status').json()
        self.assertTrue(status['demo_available']);self.assertIn('SNOWFLAKE_ACCOUNT',status['missing_settings'])
        self.assertNotIn('SNOWFLAKE_PASSWORD',status);self.assertIn('voice',status)

    def test_unread_stream_keeps_concurrency_guard_until_engine_finishes(self):
        started, finish = threading.Event(), threading.Event()
        def engine_stream(*args):
            started.set()
            finish.wait(timeout=3)
            yield ("test", "", "", "", "", {"input_method": "Type"})
        with patch.object(engine, 'analyze_flight', side_effect=engine_stream):
            response = api.analyze(api.AnalysisRequest(transcript='test'))
            self.assertTrue(started.wait(timeout=2))
            try:
                # Do not consume the HTTP stream: the browser may have closed.
                self.assertTrue(api._ANALYSIS_LOCK.locked())
                self.assertEqual(self.client.post('/api/analyze', json={'transcript':'second'}).status_code, 409)
            finally:
                finish.set()
            deadline=time.monotonic()+2
            while api._ANALYSIS_LOCK.locked() and time.monotonic()<deadline:
                time.sleep(.01)
            self.assertFalse(api._ANALYSIS_LOCK.locked())
            self.assertEqual(response.media_type, 'application/x-ndjson')

    def test_exact_spoken_airport_and_relative_date_regression(self):
        import datetime
        expected={'origin_iata':'JFK','dest_iata':'LHR','date_yyyy_mm_dd':'2026-10-25','approx_hour_24':19}
        phrase="I'm flying from J F K to Heathrow tomorrow around seven in the evening can you check it?"
        self.assertEqual(engine.interpret_request(phrase,datetime.date(2026,10,24))['tool_arguments'],expected)


if __name__=='__main__':unittest.main()
