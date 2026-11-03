"""Server tests. Run from the app folder:  python -m unittest discover -s tests -v

Copies server.py, tools/ and src/ into a temporary folder that has no data/ folder,
starts the real server on a free port, and checks it over HTTP. Nothing in the real
data/ folder is read or written. Standard library only; works on Windows and macOS.
"""
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# never go through a system proxy for 127.0.0.1
OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="ballast-test-")
        cls.root = os.path.join(cls.tmp, "app")
        os.makedirs(cls.root)
        shutil.copy(os.path.join(APP, "server.py"), cls.root)
        shutil.copytree(os.path.join(APP, "tools"), os.path.join(cls.root, "tools"),
                        ignore=shutil.ignore_patterns("__pycache__"))
        shutil.copytree(os.path.join(APP, "src"), os.path.join(cls.root, "src"))
        cls.port = free_port()
        env = dict(os.environ, AUTOQUIT="0")
        cls.proc = subprocess.Popen(
            [sys.executable, "server.py", str(cls.port), "--no-open"],
            cwd=cls.root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        cls.base = "http://127.0.0.1:%d" % cls.port
        for _ in range(100):
            try:
                OPENER.open(cls.base + "/", timeout=1).close()
                return
            except OSError:
                time.sleep(0.1)
        cls.proc.kill()
        raise RuntimeError("server did not start")

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        try:
            cls.proc.wait(5)
        except subprocess.TimeoutExpired:
            cls.proc.kill()
        if cls.proc.stdout:
            cls.proc.stdout.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def get(self, path, headers=None):
        req = urllib.request.Request(self.base + path, headers=headers or {})
        return OPENER.open(req, timeout=5)

    def put(self, body, headers=None):
        req = urllib.request.Request(self.base + "/api/state", data=body, method="PUT",
                                     headers=dict({"Content-Type": "application/json"}, **(headers or {})))
        return OPENER.open(req, timeout=5)

    def test_1_fresh_copy_has_no_data_folder_and_reports_empty_state(self):
        self.assertFalse(os.path.exists(os.path.join(self.root, "data")))
        with self.get("/api/state") as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(json.loads(r.read()), None)
        self.assertFalse(os.path.exists(os.path.join(self.root, "data")), "a read must not create data/")

    def test_2_page_and_modules_are_served_with_usable_types(self):
        with self.get("/") as r:
            self.assertEqual(r.status, 200)
            self.assertIn(b"Ballast", r.read())
        with self.get("/js/main.js") as r:
            self.assertEqual(r.status, 200)
            self.assertIn("javascript", r.headers["Content-Type"])
        with self.get("/css/base.css") as r:
            self.assertIn("text/css", r.headers["Content-Type"])
        with self.get("/assets/apple-touch-icon.png") as r:
            self.assertEqual(r.headers["Content-Type"], "image/png")

    def test_3_first_save_creates_data_file(self):
        with self.put(json.dumps({"version": 1, "diary": {}}).encode()) as r:
            self.assertEqual(r.status, 204)
        path = os.path.join(self.root, "data", "ballast.json")
        self.assertTrue(os.path.isfile(path))
        with open(path, encoding="utf-8") as f:
            self.assertEqual(json.load(f)["version"], 1)
        with self.get("/api/state") as r:
            self.assertEqual(json.loads(r.read())["version"], 1)
        self.assertFalse(os.path.exists(path + ".tmp"))

    def test_4_unicode_round_trip(self):
        text = "café — 日本語 \U0001F319"
        with self.put(json.dumps({"note": text}, ensure_ascii=False).encode("utf-8")):
            pass
        with self.get("/api/state") as r:
            self.assertEqual(json.loads(r.read().decode("utf-8"))["note"], text)

    def test_5_bad_json_is_rejected_and_file_untouched(self):
        path = os.path.join(self.root, "data", "ballast.json")
        with open(path, "rb") as f:
            before = f.read()
        with self.assertRaises(urllib.error.HTTPError) as cm:
            self.put(b"{not json")
        self.assertEqual(cm.exception.code, 400)
        with open(path, "rb") as f:
            self.assertEqual(f.read(), before)

    def test_6_foreign_host_header_is_refused(self):
        for host in ("evil.example", "evil.example:%d" % self.port, "127.0.0.1.evil.example"):
            with self.assertRaises(urllib.error.HTTPError) as cm:
                self.get("/api/state", {"Host": host})
            self.assertEqual(cm.exception.code, 403, host)
            with self.assertRaises(urllib.error.HTTPError) as cm:
                self.put(b"{}", {"Host": host})
            self.assertEqual(cm.exception.code, 403, host)
        with self.get("/api/state", {"Host": "localhost:%d" % self.port}) as r:
            self.assertEqual(r.status, 200)

    def test_7_other_put_paths_and_files_outside_src_are_not_served(self):
        req = urllib.request.Request(self.base + "/other", data=b"{}", method="PUT")
        with self.assertRaises(urllib.error.HTTPError) as cm:
            OPENER.open(req, timeout=5)
        self.assertEqual(cm.exception.code, 404)
        for p in ("/data/ballast.json", "/../data/ballast.json", "/server.py"):
            with self.assertRaises(urllib.error.HTTPError) as cm:
                self.get(p)
            self.assertEqual(cm.exception.code, 404, p)


class BuildTest(unittest.TestCase):
    def test_built_page_is_standalone(self):
        """dist/Ballast.html must work from disk or a static host: no root-absolute URLs,
        no external files, iPhone meta tags present."""
        with open(os.path.join(APP, "dist", "Ballast.html"), encoding="utf-8") as f:
            html = f.read()
        import re
        self.assertIsNone(re.search(r'(?:src|href)=["\'](?!#|data:|https?:)[^"\']+["\']', html),
                          "page references a separate file")
        self.assertNotIn('"/api', html)
        self.assertNotIn("'/api", html)
        self.assertIn("viewport-fit=cover", html)
        self.assertIn('name="apple-mobile-web-app-capable"', html)
        self.assertIn('rel="apple-touch-icon" href="data:image/png;base64,', html)
        self.assertNotIn("__autoquit", html)


if __name__ == "__main__":
    unittest.main()
