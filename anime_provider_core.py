from __future__ import annotations

import os
from typing import Any

from anime_parsers_ru.api_aniliberty import AnilibertyAPI


class AnimeProviderError(RuntimeError):
    pass


def _pick_result(results: list[dict[str, Any]], query: str) -> dict[str, Any] | None:
    clean = [item for item in results if isinstance(item, dict)]

    if not clean:
        return None

    needle = " ".join(query.lower().split())

    for item in clean:
        name = item.get("name") or {}
        if not isinstance(name, dict):
            continue

        for key in ("main", "english", "alternative"):
            value = name.get(key)
            if isinstance(value, str) and " ".join(value.lower().split()) == needle:
                return item

    return clean[0]


def _poster_url(poster: Any) -> str | None:
    if not isinstance(poster, dict):
        return None

    optimized = poster.get("optimized")
    if isinstance(optimized, dict) and optimized.get("src"):
        src = str(optimized["src"]).strip()
    else:
        src = str(poster.get("src") or poster.get("preview") or "").strip()

    if not src:
        return None

    if src.startswith("//"):
        return f"https:{src}"

    if src.startswith("http://") or src.startswith("https://"):
        return src

    site = os.environ.get("ANILIBERTY_SITE", "https://anilibria.top").rstrip("/")
    return f"{site}/{src.lstrip('/')}"


def _external_player_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    url = value.strip()
    if not url:
        return None

    if url.startswith("//"):
        return f"https:{url}"

    return url


def resolve_anime(title: str, season: int = 1, episode: int = 1) -> dict[str, Any]:
    query = (title or "").strip()

    if not query:
        raise AnimeProviderError("Пустое название аниме.")

    api = AnilibertyAPI()

    try:
        response = api.Anime.Catalog.releases(
            page=1,
            limit=10,
            search=query,
        )
    except Exception as exc:
        raise AnimeProviderError(f"Ошибка AniLiberty: {exc}") from exc

    if not isinstance(response, dict):
        raise AnimeProviderError("AniLiberty вернул некорректный ответ.")

    results = response.get("data")
    if not isinstance(results, list):
        return {
            "ok": True,
            "found": False,
            "query": query,
            "sources": [],
        }

    match = _pick_result(results, query)

    if not match:
        return {
            "ok": True,
            "found": False,
            "query": query,
            "sources": [],
        }

    name = match.get("name") if isinstance(match.get("name"), dict) else {}

    genres_raw = match.get("genres")
    genres: list[str] = []

    if isinstance(genres_raw, list):
        for genre in genres_raw:
            if isinstance(genre, dict) and genre.get("name"):
                genres.append(str(genre["name"]))

    external_player = _external_player_url(match.get("external_player"))

    source: dict[str, Any] = {
        "label": "AniLiberty",
        "player": "aniliberty",
        "embed": external_player,
        "kind": "embed" if external_player else None,
        "stream": None,
    }

    sources = [source] if external_player else []

    return {
        "ok": True,
        "found": True,
        "query": query,
        "title": name.get("main"),
        "original_title": name.get("english") or name.get("alternative"),
        "image": _poster_url(match.get("poster")),
        "description": match.get("description"),
        "episodes": match.get("episodes_total"),
        "genres": genres,
        "status": (
            match.get("production_status")
            or match.get("publish_status")
            or None
        ),
        "aniliberty_id": match.get("id"),
        "aniliberty_alias": match.get("alias"),
        "sources": sources,
        "season": season,
        "episode": episode,
    }
