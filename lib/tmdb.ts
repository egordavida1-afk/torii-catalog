import { prisma } from "@/lib/prisma";
import { normalizeHttpUrl } from "@/lib/security";
import { slugify } from "@/lib/utils";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

type TmdbListResponse<T> = { results?: T[] };
type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
};
type TmdbGenre = { id: number; name: string };

type ImportResult = {
  imported: number;
  updated: number;
  movies: number;
  series: number;
  anime: number;
  genres: number;
};

function getToken() {
  const token = process.env.TMDB_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("TMDB_ACCESS_TOKEN не задан. Добавь API Read Access Token в окружение Vercel/локального проекта.");
  return token;
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "ru-RU");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`TMDB вернул ${response.status}: ${detail.slice(0, 240)}`);
  }

  return response.json() as Promise<T>;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return dateOnly(date);
}

function imageUrl(path: string | null | undefined, size: "w500" | "original") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

function yearFrom(date: string | undefined) {
  const year = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isInteger(year) ? year : null;
}

function cleanOverview(value: string | undefined) {
  const text = String(value || "").trim();
  return text.length ? text.slice(0, 5000) : null;
}

function normalizeImportedUrl(url: string | null) {
  return url ? normalizeHttpUrl(url, 2048) : null;
}

function tmdbSlug(mediaType: "movie" | "tv", id: number, title: string) {
  const name = slugify(title).slice(0, 42) || "title";
  return `tmdb-${mediaType}-${id}-${name}`.slice(0, 60);
}

async function ensureGenreNames(genreMap: Map<number, string>) {
  let created = 0;
  for (const [id, name] of genreMap) {
    const cleanName = String(name || "").trim().slice(0, 50);
    if (!cleanName) continue;
    const slug = slugify(cleanName);
    if (!slug) continue;
    const existing = await prisma.genre.findUnique({ where: { slug } });
    if (!existing) {
      await prisma.genre.create({ data: { name: cleanName, slug } });
      created += 1;
    }
  }
  return created;
}

async function importItems(
  items: TmdbItem[],
  mediaType: "movie" | "tv",
  category: "movie" | "series" | "anime",
  genreMap: Map<number, string>,
): Promise<{ imported: number; updated: number }> {
  let imported = 0;
  let updated = 0;

  for (const item of items) {
    const title = String(item.title || item.name || "").trim();
    if (!title || !item.poster_path) continue;

    const sourceKey = `tmdb:${mediaType}:${item.id}`;
    const genres = (item.genre_ids || [])
      .map((id) => genreMap.get(id))
      .filter((name): name is string => Boolean(name))
      .slice(0, 8)
      .join(",");

    const data = {
      title: title.slice(0, 120),
      description: cleanOverview(item.overview),
      posterUrl: normalizeImportedUrl(imageUrl(item.poster_path, "w500")),
      backgroundUrl: normalizeImportedUrl(imageUrl(item.backdrop_path, "original")),
      year: yearFrom(mediaType === "movie" ? item.release_date : item.first_air_date),
      genres: genres || null,
      status: "ongoing",
      type: mediaType === "movie" ? "movie" : "series",
      category,
      source: "tmdb",
      sourceKey,
      videoUrl: null,
    } as const;

    const existing = await prisma.anime.findUnique({ where: { sourceKey } });
    if (existing) {
      if (existing.source === "tmdb") {
        await prisma.anime.update({ where: { id: existing.id }, data });
        updated += 1;
      }
    } else {
      await prisma.anime.create({
        data: {
          ...data,
          slug: tmdbSlug(mediaType, item.id, title),
        },
      });
      imported += 1;
    }
  }

  return { imported, updated };
}

export async function syncTmdbCatalog() {
  const limit = 16;
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<TmdbListResponse<TmdbGenre>>("/genre/movie/list"),
    tmdbFetch<TmdbListResponse<TmdbGenre>>("/genre/tv/list"),
  ]);

  const genreMap = new Map<number, string>();
  for (const genre of [...(movieGenres.results || []), ...(tvGenres.results || [])]) genreMap.set(genre.id, genre.name);
  const createdGenres = await ensureGenreNames(genreMap);

  const from = daysAgo(180);
  const to = dateOnly(new Date());

  const [movies, series, animeSeries, animeMovies] = await Promise.all([
    tmdbFetch<TmdbListResponse<TmdbItem>>("/discover/movie", {
      include_adult: false,
      include_video: false,
      sort_by: "primary_release_date.desc",
      "primary_release_date.gte": from,
      "primary_release_date.lte": to,
      without_genres: "16",
      "vote_count.gte": 5,
      page: 1,
    }),
    tmdbFetch<TmdbListResponse<TmdbItem>>("/discover/tv", {
      include_adult: false,
      sort_by: "first_air_date.desc",
      "first_air_date.gte": from,
      "first_air_date.lte": to,
      without_genres: "16",
      "vote_count.gte": 3,
      page: 1,
    }),
    tmdbFetch<TmdbListResponse<TmdbItem>>("/discover/tv", {
      include_adult: false,
      sort_by: "first_air_date.desc",
      "first_air_date.gte": from,
      "first_air_date.lte": to,
      with_origin_country: "JP",
      with_genres: "16",
      page: 1,
    }),
    tmdbFetch<TmdbListResponse<TmdbItem>>("/discover/movie", {
      include_adult: false,
      include_video: false,
      sort_by: "primary_release_date.desc",
      "primary_release_date.gte": from,
      "primary_release_date.lte": to,
      with_origin_country: "JP",
      with_genres: "16",
      page: 1,
    }),
  ]);

  const movieResult = await importItems((movies.results || []).slice(0, limit), "movie", "movie", genreMap);
  const seriesResult = await importItems((series.results || []).slice(0, limit), "tv", "series", genreMap);
  const animeSeriesResult = await importItems((animeSeries.results || []).slice(0, limit), "tv", "anime", genreMap);
  const animeMovieResult = await importItems((animeMovies.results || []).slice(0, Math.ceil(limit / 2)), "movie", "anime", genreMap);

  return {
    imported: movieResult.imported + seriesResult.imported + animeSeriesResult.imported + animeMovieResult.imported,
    updated: movieResult.updated + seriesResult.updated + animeSeriesResult.updated + animeMovieResult.updated,
    movies: (movies.results || []).slice(0, limit).filter((item) => item.poster_path).length,
    series: (series.results || []).slice(0, limit).filter((item) => item.poster_path).length,
    anime: (animeSeries.results || []).slice(0, limit).filter((item) => item.poster_path).length + (animeMovies.results || []).slice(0, Math.ceil(limit / 2)).filter((item) => item.poster_path).length,
    genres: createdGenres,
  } satisfies ImportResult;
}
