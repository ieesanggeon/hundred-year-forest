"""Python fallback for the Windows game launcher (standard library only)."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
WORKSPACE = hashlib.sha256(str(ROOT).replace('\\', '/').lower().encode()).hexdigest()
IDENTITY = {'app': 'hundred-year-forest', 'workspaceId': WORKSPACE, 'pid': os.getpid()}


class GameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.split('?')[0] == '/__rpg_health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(IDENTITY).encode())
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


def same_game(port):
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/__rpg_health', timeout=.6) as response:
            data = json.load(response)
        return data.get('app') == IDENTITY['app'] and data.get('workspaceId') == WORKSPACE
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--open', action='store_true')
    parser.add_argument('--no-open', action='store_true')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        raise RuntimeError('Port must be between 0 and 65535.')
    for name in ['index.html', 'dist/game.bundle.js']:
        if not (ROOT / name).is_file():
            raise RuntimeError(f'Required game file is missing: {name}')
    ports = [0] if not args.port else list(range(args.port, min(args.port + 10, 65536))) + [0]
    for port in ports:
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), GameHandler)
        except OSError:
            if port and same_game(port):
                url = f'http://127.0.0.1:{port}'
                print(f'Game already running: {url}', flush=True)
                if args.open and not args.no_open:
                    webbrowser.open(url)
                return
            continue
        url = f'http://127.0.0.1:{server.server_port}'
        print(f'Game running: {url}', flush=True)
        print('Press Ctrl+C in this window to stop the game.', flush=True)
        if args.open and not args.no_open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        finally:
            server.server_close()
        return
    raise RuntimeError('Cannot start the game server.')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as error:
        print(f'Game startup failed: {error}', flush=True)
        raise SystemExit(1)
