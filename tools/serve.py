"""serve.py: static file server that turns itself off when the page is closed.

    python tools/serve.py PORT DIRECTORY [--open] [--keep]

Drop-in replacement for `python -m http.server PORT --directory DIR`. server.py
imports Handler from here. Differences:

  - every .html it serves gets the autoquit heartbeat (see autoquit.py), so the
    process exits ~15 s after the last tab showing it closes, 90 s after start
    if nothing ever opened it, and immediately if the process that launched it
    (a terminal or command window) goes away
  - Cache-Control: no-store, so edits show up on reload
  - binds 127.0.0.1 only
  - --open launches the default browser; --keep disables autoquit
"""
from __future__ import annotations

import os
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import autoquit  # noqa: E402


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    # Pin the types the app needs. Python otherwise asks the OS (the Windows
    # registry, /etc/mime.types on macOS), and a wrong answer for .js stops
    # ES modules from loading.
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
        ".html": "text/html",
    })

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if autoquit.handle(self, path):
            return
        local = self.translate_path(self.path)
        if os.path.isdir(local):
            local = os.path.join(local, "index.html")
        if local.lower().endswith((".html", ".htm")) and os.path.isfile(local):
            with open(local, "rb") as f:
                body = autoquit.inject(f.read())
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if autoquit.handle(self, urlparse(self.path).path):
            return
        self.send_error(405)

    def log_message(self, fmt, *args):
        if "/__ping" in fmt % args:
            return
        super().log_message(fmt, *args)


def main(argv):
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 2
    port = int(argv[0])
    directory = os.path.abspath(argv[1])
    flags = set(argv[2:])
    if "--keep" in flags:
        os.environ["AUTOQUIT"] = "0"
    handler = lambda *a, **k: Handler(*a, directory=directory, **k)  # noqa: E731
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    httpd.daemon_threads = True
    url = f"http://127.0.0.1:{port}/"
    print(f"serving {directory} on {url}"
          + ("" if autoquit.enabled() else " (autoquit off)"), flush=True)
    if "--open" in flags:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
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
