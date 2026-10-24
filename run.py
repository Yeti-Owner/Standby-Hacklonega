"""Start Tomas's frontend and Callum's resident Python engine together."""
import argparse
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dev', action='store_true', help='Watch frontend changes instead of building for production.')
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    load_dotenv(ROOT / '.env')
    os.environ.setdefault('NEXT_TELEMETRY_DISABLED', '1')
    node = shutil.which('node')
    next_bin = ROOT / 'standby-app/node_modules/next/dist/bin/next'
    if not node or not next_bin.exists():
        raise SystemExit('Install Node.js, then run: npm ci --prefix standby-app (see README.md).')
    api_port = int(os.getenv('STANDBY_API_PORT', '7860'))
    web_port = int(os.getenv('STANDBY_WEB_PORT', '3000'))
    if api_port == web_port or not all(1024 <= port <= 65535 for port in (api_port, web_port)):
        raise SystemExit('Choose two different ports between 1024 and 65535 in .env.')
    for port in (api_port, web_port):
        with socket.socket() as check:
            if check.connect_ex(('127.0.0.1', port)) == 0:
                raise SystemExit(f'Port {port} is already in use. Close the previous server or choose another port in .env.')
    os.environ['STANDBY_API_PORT'] = str(api_port)
    processes = []
    creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    try:
        if not args.dev:
            print('Building the latest frontend…', flush=True)
            subprocess.run([node, str(next_bin), 'build'], cwd=ROOT/'standby-app', check=True, creationflags=creationflags, stdout=sys.stdout, stderr=sys.stderr)
        processes.append(subprocess.Popen([sys.executable, str(ROOT/'api.py')], cwd=ROOT, creationflags=creationflags, stdout=sys.stdout, stderr=sys.stderr))
        processes.append(subprocess.Popen([node, str(next_bin), 'dev' if args.dev else 'start', '--hostname', '127.0.0.1', '--port', str(web_port)], cwd=ROOT/'standby-app', creationflags=creationflags, stdout=sys.stdout, stderr=sys.stderr))
        url=f'http://127.0.0.1:{web_port}'
        deadline=time.monotonic()+60
        while time.monotonic()<deadline:
            if any(process.poll() is not None for process in processes):
                raise RuntimeError('A server stopped during startup. Read the message above.')
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{api_port}/api/status',timeout=2) as response:
                    if response.status==200:
                        with urllib.request.urlopen(url,timeout=2) as web_response:
                            if web_response.status==200:
                                break
            except (OSError, TimeoutError):
                time.sleep(.5)
        else:
            raise RuntimeError('The local servers did not become ready within 60 seconds.')
        print(f'\nStandby is ready: {url}\nVoice warms up once and stays loaded. Keep this terminal open; Ctrl+C closes both servers.',flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        while all(process.poll() is None for process in processes):
            time.sleep(.5)
    except KeyboardInterrupt:
        print('\nClosing Standby…',flush=True)
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
                try: process.wait(timeout=10)
                except subprocess.TimeoutExpired: process.kill(); process.wait()


if __name__=='__main__':
    main()
