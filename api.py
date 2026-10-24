"""Local JSON/streaming adapter around Callum's unchanged concierge engine."""
from contextlib import asynccontextmanager
import datetime as dt
import json
import os
from pathlib import Path
import secrets
import queue
import tempfile
import threading
import time
from urllib.parse import urlparse

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import app as engine

_ANALYSIS_LOCK = threading.Lock()
_VOICE_LOCK = threading.Lock()
_REVIEWS_LOCK = threading.Lock()
_REVIEWS = {}
REVIEW_TTL = 600
MAX_AUDIO_BYTES = 25 * 1024 * 1024


def cleanup_reviews():
    with _REVIEWS_LOCK:
        expired = [token for token, item in _REVIEWS.items() if time.monotonic() - item['created'] > REVIEW_TTL]
        for token in expired:
            Path(_REVIEWS.pop(token)['path']).unlink(missing_ok=True)


@asynccontextmanager
async def lifespan(_api):
    if os.getenv('STANDBY_SKIP_ASR_PRELOAD') != '1':
        engine.start_speech_preload()
    stop_cleanup = threading.Event()
    def sweep():
        while not stop_cleanup.wait(30):
            cleanup_reviews()
    sweeper = threading.Thread(target=sweep, name='standby-audio-cleanup', daemon=True)
    sweeper.start()
    try:
        yield
    finally:
        stop_cleanup.set()
        sweeper.join(timeout=2)
        with _REVIEWS_LOCK:
            for item in _REVIEWS.values():
                Path(item['path']).unlink(missing_ok=True)
            _REVIEWS.clear()


api = FastAPI(title='Standby local concierge', lifespan=lifespan, docs_url=None, redoc_url=None)


@api.middleware('http')
async def local_requests(request: Request, call_next):
    # No permissive CORS: the Next.js same-origin proxy is the browser entry point.
    origin = request.headers.get('origin')
    if request.method in {'POST', 'DELETE'} and origin and urlparse(origin).hostname not in {'localhost', '127.0.0.1', '::1'}:
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail': 'Use the local Standby website.'}, status_code=403)
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    return response


@api.get('/api/status')
def status():
    cleanup_reviews()
    provider = os.getenv('LLM_PROVIDER', 'groq').lower()
    key = 'GROQ_API_KEY' if provider == 'groq' else 'OPENAI_API_KEY'
    missing = [name for name in (key, 'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_WAREHOUSE') if not os.getenv(name)]
    if os.getenv('SNOWFLAKE_AUTHENTICATOR', 'snowflake').lower() == 'snowflake' and not os.getenv('SNOWFLAKE_PASSWORD'):
        missing.append('SNOWFLAKE_PASSWORD')
    if not (os.getenv('SERPAPI_KEY') or os.getenv('AVIATIONSTACK_API_KEY')):
        missing.append('SERPAPI_KEY or AVIATIONSTACK_API_KEY')
    try:
        usage = engine.groq_usage_label()
    except ValueError:
        usage = 'Usage counter needs attention; live requests remain protected.'
    return {'voice': dict(engine._ASR_STATE), 'usage': usage.replace('**', ''), 'missing_settings': missing,
            'demo_available': os.getenv('STANDBY_SHOW_DEMO') == '1' or not (engine.ROOT / '.env').exists() or bool(missing)}


class AnalysisRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=6000)
    review_token: str | None = Field(default=None, max_length=128)


@api.post('/api/transcribe')
def transcribe(audio: UploadFile = File(...)):
    """Accept PCM WAV from the browser; no external APIs before confirmation."""
    cleanup_reviews()
    if not _VOICE_LOCK.acquire(blocking=False):
        raise HTTPException(409, 'Another recording is being transcribed. Please wait.')
    path = None
    try:
        data = audio.file.read(MAX_AUDIO_BYTES + 1)
        if len(data) > MAX_AUDIO_BYTES:
            raise HTTPException(413, 'Use a recording under two minutes (25 MB maximum).')
        if len(data) < 12 or data[:4] != b'RIFF' or data[8:12] != b'WAVE':
            raise HTTPException(415, 'Send WAV audio. The Standby website converts recordings and uploads automatically.')
        with tempfile.NamedTemporaryFile(suffix='.wav', prefix='standby-', delete=False) as file:
            file.write(data)
            path = Path(file.name)
        started = time.perf_counter()
        text = engine.transcribe_audio(str(path)).strip()
        if not text or len(text) > 6000:
            raise HTTPException(422, 'No usable speech was detected. Record a shorter request or type it.')
        seconds = round(time.perf_counter() - started, 2)
        token = secrets.token_urlsafe(32)
        with _REVIEWS_LOCK:
            if len(_REVIEWS) >= 8:
                oldest = min(_REVIEWS, key=lambda item: _REVIEWS[item]['created'])
                Path(_REVIEWS.pop(oldest)['path']).unlink(missing_ok=True)
            _REVIEWS[token] = {'path': str(path), 'created': time.monotonic(),
                'review': {'signature': engine.audio_signature(str(path)), 'speech_time_s': seconds}}
        path = None  # Retained only until confirmation/rejection/expiry, never tracked.
        return {'transcript': text, 'review_token': token, 'speech_time_s': seconds}
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'Voice transcription failed. Try a shorter recording or type your request.') from None
    finally:
        if path:
            path.unlink(missing_ok=True)
        audio.file.close()
        _VOICE_LOCK.release()


@api.delete('/api/review/{token}')
def discard_review(token: str):
    with _REVIEWS_LOCK:
        item = _REVIEWS.pop(token, None)
    if item:
        Path(item['path']).unlink(missing_ok=True)
    return {'discarded': True}


@api.post('/api/analyze')
def analyze(body: AnalysisRequest):
    if not body.transcript.strip():
        raise HTTPException(422, 'Enter your route, date and departure time.')
    if not _ANALYSIS_LOCK.acquire(blocking=False):
        raise HTTPException(409, 'Another flight analysis is running. Please wait to protect API allowances.')
    cleanup_reviews()
    item = None
    if body.review_token:
        with _REVIEWS_LOCK:
            item = _REVIEWS.pop(body.review_token, None)
        if not item:
            _ANALYSIS_LOCK.release()
            raise HTTPException(410, 'That recording review expired. Record again or use typed input.')

    updates = queue.Queue()
    def produce():
        # Finish the bounded, already-authorized analysis even if the tab closes.
        # Keep the quota/concurrency lock until the engine actually finishes, not
        # just until the HTTP reader disconnects. Completed work fills its cache.
        try:
            for output in engine.analyze_flight(item['path'] if item else None, body.transcript,
                    'Voice' if item else 'Type', item['review'] if item else None):
                result = output[5]
                updates.put(json.dumps({'transcript': output[0], 'result': result,
                    'done': bool(result and ('input_method' in result or 'error' in result))}, ensure_ascii=False) + '\n')
        except Exception:
            updates.put(json.dumps({'transcript': body.transcript, 'result': {'error': 'The local engine could not finish this request. No automatic retry was made.'}, 'done': True}) + '\n')
        finally:
            if item:
                Path(item['path']).unlink(missing_ok=True)
            _ANALYSIS_LOCK.release()
            updates.put(None)
    threading.Thread(target=produce, name='standby-api-analysis', daemon=True).start()
    def events():
        while True:
            event = updates.get()
            if event is None:
                break
            yield event
    return StreamingResponse(events(), media_type='application/x-ndjson', headers={'X-Accel-Buffering': 'no'})



def demo_result():
    """Removable fixture: never calls AI, flight search, weather services or Snowflake."""
    day = engine.request_today() + dt.timedelta(days=1)
    departure = engine.airport_moment(f'{day.isoformat()}T19:15:00', engine.airport_info('JFK'))
    arrival = departure + dt.timedelta(hours=7)
    flight = engine.normalize_flight(dict(flight_number='BA-DEMO', airline_name='British Airways', airline_iata='BA',
        origin_iata='JFK', dest_iata='LHR', scheduled_departure=departure.isoformat(), scheduled_arrival=arrival.isoformat(),
        aircraft_or_status='Demo fixture — not a real schedule'))
    stats = dict(total_flights=2400, delayed_flights=576, delay_prob_pct=24.0,
        avg_delay_when_late_mins=38.2, query_time_ms=8.4, source='demo_fixture', scope='hour_window',
        notice='Synthetic test data, not queried from Snowflake.')
    result = engine.resolved_result(flight, {'source': 'demo_fixture', 'flights': [flight]}, stats)
    result['airline_support'] = engine.airline_support_details(flight, 'serpapi')
    result['airline_support']['identity_basis'] = 'Demo airline example; not a verified flight'
    forecasts = {}
    for side, target, temperature, description in [('departure', flight['scheduled_departure'], 64, 'Partly cloudy'), ('arrival', flight['scheduled_arrival'], 51, 'Light rain')]:
        forecasts[side] = dict(status='available', temperature_f=temperature, description=description,
            precipitation_probability=25 if side == 'departure' else 60, wind_mph=9, gust_mph=16,
            visibility_m=16000, valid_at=target, source='demo_fixture')
    result.update(demo=True, input_method='Demo', enrichment_status='complete',
        concierge_summary='DEMO ONLY: JFK to Heathrow tomorrow around 7 PM. All schedule, history, weather and wait figures below are synthetic fixtures; no API calls were made.',
        request_interpretation=engine.interpret_request(DEMO_TRANSCRIPT),
        travel_context={'flight': flight, 'forecasts': forecasts, 'observations': {},
            'security': {'status': 'available', 'standard_minutes': 18, 'standard_measurement': 'modeled',
                'precheck_minutes': 7, 'precheck_measurement': 'modeled', 'updated_at': engine.utc_now().isoformat(), 'source': 'demo_fixture'},
            'faa': {'JFK': {'status': 'clear', 'events': [], 'source': 'demo_fixture'}}})
    return result


DEMO_TRANSCRIPT = "I'm flying from JFK to Heathrow tomorrow around seven in the evening can you check it?"


@api.get('/api/demo')
def demo():
    return {'transcript': DEMO_TRANSCRIPT, 'result': demo_result(), 'done': True}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(api, host='127.0.0.1', port=int(os.getenv('STANDBY_API_PORT', '7860')), access_log=False)
