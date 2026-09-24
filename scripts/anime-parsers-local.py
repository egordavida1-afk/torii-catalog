from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

from anime_provider_core import AnimeProviderError, resolve_anime

SECRET = os.environ.get("ANIME_PARSERS_SECRET", "")


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.send_json(200, {"ok": True, "service": "anime-parsers-ru", "version": "1.18.0"})

    def do_POST(self):
        if SECRET and self.headers.get("x-anime-parsers-secret") != SECRET:
            self.send_json(401, {"ok": False, "error": "Unauthorized"})
            return
        try:
            length = int(self.headers.get("content-length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            result = resolve_anime(
                title=str(payload.get("title") or ""),
                season=int(payload.get("season") or 1),
                episode=int(payload.get("episode") or 1),
            )
            self.send_json(200, result)
        except AnimeProviderError as exc:
            self.send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": f"Anime provider error: {exc}"})


if __name__ == "__main__":
    port = int(sys.argv[1] if len(sys.argv) > 1 else 8001)
    print(f"AnimeParsers local gateway: http://127.0.0.1:{port}")
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
