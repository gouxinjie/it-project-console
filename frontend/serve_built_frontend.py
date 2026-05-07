import os
import shutil
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ROOT = os.path.join(os.path.dirname(__file__), "dist")
BACKEND = "http://127.0.0.1:8000"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy()
            return
        self.serve_spa()

    def do_HEAD(self):
        if self.path.startswith("/api/"):
            self.proxy()
            return
        self.serve_spa(head_only=True)

    def do_POST(self):
        self.proxy()

    def do_PUT(self):
        self.proxy()

    def do_PATCH(self):
        self.proxy()

    def do_DELETE(self):
        self.proxy()

    def do_OPTIONS(self):
        self.proxy()

    def serve_spa(self, head_only: bool = False):
        path = urlsplit(self.path).path
        candidate = os.path.join(ROOT, path.lstrip("/"))

        if path.startswith("/assets/") and os.path.exists(candidate):
            if head_only:
                super().do_HEAD()
            else:
                super().do_GET()
            return

        if path == "/" or not os.path.exists(candidate) or os.path.isdir(candidate):
            self.path = "/index.html"

        if head_only:
            super().do_HEAD()
        else:
            super().do_GET()

    def proxy(self):
        target = BACKEND + self.path
        length = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(length) if length else None
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "connection", "content-length"}
        }
        req = Request(target, data=data, headers=headers, method=self.command)

        try:
            with urlopen(req, timeout=30) as resp:
                self.send_response(resp.status)
                for key, value in resp.getheaders():
                    if key.lower() in {"transfer-encoding", "connection", "server", "date"}:
                        continue
                    self.send_header(key, value)
                self.end_headers()
                if self.command != "HEAD":
                    shutil.copyfileobj(resp, self.wfile)
        except HTTPError as resp:
            self.send_response(resp.code)
            for key, value in resp.headers.items():
                if key.lower() in {"transfer-encoding", "connection", "server", "date"}:
                    continue
                self.send_header(key, value)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(resp.read())
        except Exception as exc:
            body = f"Proxy error: {exc}".encode("utf-8", "replace")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 3000), Handler)
    server.serve_forever()
