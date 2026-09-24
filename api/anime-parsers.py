from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler

from anime_provider_core import AnimeProviderError, resolve_anime
from anime_parsers_ru.api_aniliberty import AnilibertyAPI

SECRET = os.environ.get("ANIME_PARSERS_SECRET", "")


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if SECRET and self.headers.get("x-anime-parsers-secret") != SECRET:
            self._send(401, {"ok": False, "error": "Unauthorized"})
            return

        try:
            length = int(self.headers.get("content-length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")

            mode = str(payload.get("mode") or "resolve").strip().lower()

            if mode == "catalog":
                page = max(1, int(payload.get("page") or 1))
                limit = min(50, max(1, int(payload.get("limit") or 50)))

                api = AnilibertyAPI()
                result = api.Anime.Catalog.releases(
                    page=page,
                    limit=limit,
                )

                self._send(200, {
                    "ok": True,
                    "mode": "catalog",
                    **result,
                })
                return

            title = str(payload.get("title") or "").strip()
            season = int(payload.get("season") or 1)
            episode = int(payload.get("episode") or 1)

            result = resolve_anime(
                title=title,
                season=season,
                episode=episode,
            )

            self._send(200, result)

        except AnimeProviderError as exc:
            self._send(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self._send(500, {
                "ok": False,
                "error": f"Anime provider error: {exc}",
            })

    def do_GET(self):
        self._send(200, {
            "ok": True,
            "service": "anime-parsers-ru",
            "version": "1.18.0",
        })
