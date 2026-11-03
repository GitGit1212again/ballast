"""Ballast local server.

    python server.py [PORT] [--no-open]       (macOS/Linux: python3 server.py ...)

Serves src/ over http://127.0.0.1:PORT (default 8774) and persists the app's
state to data/ballast.json through GET/PUT /api/state. The data folder is
created on the first save, so a fresh copy of the app starts empty.

The process exits shortly after the browser tab is closed (tools/autoquit.py);
set AUTOQUIT=0 in the environment to keep it running. Python 3 standard
library only; works the same on Windows and macOS.

You do not need this server to use Ballast: dist/Ballast.html opens straight
from disk or from any static host and keeps its data in the browser instead.
"""
from __future__ import annotations

import json
import os
import sys
import threading
import webbrowser
from http.server import ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(ROOT, "tools")
sys.path.insert(0, TOOLS)
try:
    import autoquit  # noqa: E402
    from serve import Handler as StaticHandler  # noqa: E402
except ImportError as exc:  # a partial copy of the app
    sys.exit("Ballast: cannot load %s (%s). Keep the tools/ folder next to server.py." % (TOOLS, exc))

SRC = os.path.join(ROOT, "src")
DATA_DIR = os.path.join(ROOT, "data")
STATE_FILE = os.path.join(DATA_DIR, "ballast.json")
DEFAULT_PORT = 8774
MAX_STATE_BYTES = 50 * 1024 * 1024  # a diary is kilobytes; this only stops runaway bodies
_lock = threading.Lock()


def read_state() -> bytes:
    with _lock:
        if not os.path.isfile(STATE_FILE):
            return b"null"
        with open(STATE_FILE, "rb") as f:
            return f.read()


def write_state(body: bytes) -> None:
    json.loads(body)  # validate before touching disk
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with _lock:
        with open(tmp, "wb") as f:
            f.write(body)
        os.replace(tmp, STATE_FILE)


class Handler(StaticHandler):
    def _host_ok(self) -> bool:
        """Only answer /api/state for a loopback Host header. This blocks DNS
        rebinding: a web page cannot reach the diary through a hostname it
        controls that happens to resolve to 127.0.0.1."""
        port = self.server.server_address[1]
        host = (self.headers.get("Host") or "").strip().lower()
        return host in {"127.0.0.1:%d" % port, "localhost:%d" % port, "[::1]:%d" % port}

    def do_GET(self):
        if urlparse(self.path).path == "/api/state":
            if not self._host_ok():
                self.send_error(403, "loopback host only")
                return
            body = read_state()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_PUT(self):
        if urlparse(self.path).path != "/api/state":
            self.send_error(404)
            return
        if not self._host_ok():
            self.send_error(403, "loopback host only")
            return
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = -1
        if n < 0:
            self.send_error(400, "bad Content-Length")
            return
        if n > MAX_STATE_BYTES:
            self.send_error(413, "state too large")
            return
        body = self.rfile.read(n)
        try:
            write_state(body)
        except ValueError:
            self.send_error(400, "invalid JSON")
            return
        except OSError:
            self.send_error(500, "could not write the data file")
            return
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        if "/api/state" in fmt % args:
            return
        super().log_message(fmt, *args)


def main(argv):
    if "-h" in argv or "--help" in argv:
        print(__doc__)
        return 0
    positional = [a for a in argv if not a.startswith("-")]
    try:
        port = int(positional[0]) if positional else DEFAULT_PORT
    except ValueError:
        print("Ballast: %r is not a port number." % positional[0], file=sys.stderr)
        return 2
    handler = lambda *a, **k: Handler(*a, directory=SRC, **k)  # noqa: E731
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    except OSError as exc:
        print("Ballast: cannot listen on 127.0.0.1:%d (%s)." % (port, exc), file=sys.stderr)
        print("It may already be running (check your browser tabs), or try another port: "
              "python server.py 8800", file=sys.stderr)
        return 1
    httpd.daemon_threads = True
    url = "http://127.0.0.1:%d/" % port
    print("Ballast on " + url, flush=True)
    if "--no-open" not in argv:
        # webbrowser uses the default browser: ShellExecute on Windows, `open` on macOS.
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
        print("If no browser window appears, open that address yourself.", flush=True)
    autoquit.Watchdog().start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
