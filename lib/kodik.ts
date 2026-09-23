import { prisma } from "@/lib/prisma";
import { normalizeHttpUrl } from "@/lib/security";
import { slugify } from "@/lib/utils";

const KODIK_BASE = (process.env.KODIK_API_BASE || "https://kodik-api.com").replace(/\/$/, "");
const KODIK_TOKEN_SOURCE =
  process.env.KODIK_TOKEN_SOURCE_URL?.trim() ||
  "https://raw.githubusercontent.com/YaNesyTortiK/AnimeParsers/main/kdk_tokns/tokens.json";
const KODIK_AUTO_TOKEN = process.env.KODIK_AUTO_TOKEN?.trim().toLowerCase() !== "false";

let cachedAutoToken: string | null = null;
let cachedAutoTokenAt = 0;
let autoTokenPromise: Promise<string | null> | null = null;
const AUTO_TOKEN_CACHE_MS = 6 * 60 * 60 * 1000;

export type KodikSeason = {
  link?: string;
  episodes?: Record<string, { link?: string; title?: string; screenshots?: string[] }>;
};

export type KodikMaterial = {
  title?: string;
  anime_title?: string;
  title_en?: string;
  description?: string;
  anime_description?: string;
  poster_url?: string;
  anime_poster_url?: string;
  screenshots?: string[];
  genres?: string[];
  all_genres?: string[];
  year?: number;
  anime_status?: string;
  all_status?: string;
};

export type KodikResult = {
  id: string;
  type?: string;
  link?: string;
  title?: string;
  title_orig?: string;
  other_title?: string;
  year?: number;
  last_season?: number;
  last_episode?: number;
  episodes_count?: number;
  kinopoisk_id?: string;
  imdb_id?: string;
  shikimori_id?: string;
  quality?: string;
  camrip?: boolean;
  updated_at?: string;
  translation?: { id?: number; title?: string; type?: string };
  screenshots?: string[];
  seasons?: Record<string, KodikSeason>;
  material_data?: KodikMaterial;
};

type KodikResponse = { total?: number; results?: KodikResult[]; next_page?: string | null };

export type KodikSyncResult = {
  imported: number;
  updated: number;
  attached: number;
  movies: number;
  series: number;
  anime: number;
  cartoons: number;
  translations: number;
  episodes: number;
};

type KodikTokenRecord = {
  tokn?: string;
  functions_availability?: Record<string, boolean>;
};
type KodikTokenBundle = {
  stable?: KodikTokenRecord[];
  unstable?: KodikTokenRecord[];
  legacy?: KodikTokenRecord[];
  dead?: KodikTokenRecord[];
};

function decryptPublicToken(value: string) {
  const input = String(value || "").trim();
  if (!input || input.length < 8 || input.length % 2 !== 0) return null;
  try {
    const midpoint = Math.floor(input.length / 2);
    const firstEncoded = input.slice(0, midpoint).split("").reverse().join("");
    const secondEncoded = input.slice(midpoint).split("").reverse().join("");
    const first = Buffer.from(firstEncoded, "base64").toString("utf8");
    const second = Buffer.from(secondEncoded, "base64").toString("utf8");
    const token = `${second}${first}`.trim();
    return token || null;
  } catch {
    return null;
  }
}

async function validateKodikToken(token: string) {
  try {
    const url = new URL(`${KODIK_BASE}/list`);
    url.searchParams.set("token", token);
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      method: "POST",
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function resolveAutoToken() {
  if (!KODIK_AUTO_TOKEN) return null;
  if (cachedAutoToken && Date.now() - cachedAutoTokenAt < AUTO_TOKEN_CACHE_MS) return cachedAutoToken;
  if (autoTokenPromise) return autoTokenPromise;

  autoTokenPromise = (async () => {
    const response = await fetch(KODIK_TOKEN_SOURCE, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Не удалось получить список публичных токенов Kodik: HTTP ${response.status}.`);
    }

    const bundle = (await response.json()) as KodikTokenBundle;
    const candidates = [
      ...(bundle.stable || []),
      ...(bundle.unstable || []),
    ]
      .filter((item) => item.tokn && item.functions_availability?.get_list)
      .map((item) => decryptPublicToken(item.tokn!))
      .filter((token): token is string => Boolean(token));

    for (const token of candidates.slice(0, 6)) {
      if (await validateKodikToken(token)) {
        cachedAutoToken = token;
        cachedAutoTokenAt = Date.now();
        return token;
      }
    }

    throw new Error("Не найден рабочий публичный токен Kodik. Попробуй позже или задай KODIK_API_TOKEN.");
  })();

  try {
    return await autoTokenPromise;
  } finally {
    autoTokenPromise = null;
  }
}

async function getToken() {
  const explicit = process.env.KODIK_API_TOKEN?.trim();
  if (explicit) return explicit;
  const auto = await resolveAutoToken();
  if (auto) return auto;
  throw new Error("Kodik недоступен: не найден токен. Автоматический поиск токена отключён или не вернул рабочее значение.");
}

async function apiUrl(pathOrUrl: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const url = new URL(pathOrUrl.startsWith("http") ? pathOrUrl : `${KODIK_BASE}${pathOrUrl}`);
  url.searchParams.set("token", await getToken());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

async function kodikPost<T>(pathOrUrl: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const response = await fetch(await apiUrl(pathOrUrl, params), {
    method: "POST",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Kodik вернул ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

function dateFromKodik(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizedKodikLink(link?: string | null) {
  if (!link) return null;
  const absolute = link.startsWith("//") ? `https:${link}` : link;
  return normalizeHttpUrl(absolute, 2048);
}

function cleanText(value: unknown, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function normalizeTitle(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/[\[\(](?:тв|tv|сезон|season)\s*[-–]?\s*\d+[\]\)]/gi, "")
    .replace(/[\[\(][^\]\)]*(?:special|спешл|ova|ona)[^\]\)]*[\]\)]/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findExisting(result: KodikResult) {
  if (result.kinopoisk_id) {
    const row = await prisma.anime.findFirst({ where: { kinopoiskId: result.kinopoisk_id } });
    if (row) return row;
  }
  if (result.imdb_id) {
    const row = await prisma.anime.findFirst({ where: { imdbId: result.imdb_id } });
    if (row) return row;
  }
  if (result.shikimori_id) {
    const row = await prisma.anime.findFirst({ where: { shikimoriId: result.shikimori_id } });
    if (row) return row;
  }

  const title = normalizeTitle(cleanText(result.title || result.material_data?.title || result.title_orig, 120));
  if (!title) return null;
  const candidates = await prisma.anime.findMany({
    where: result.year
      ? { year: result.year }
      : { year: null },
    select: { id: true, title: true, originalTitle: true },
    take: 80,
  });
  const hit = candidates.find((candidate) => [candidate.title, candidate.originalTitle || ""].some((value) => normalizeTitle(value) === title));
  return hit ? prisma.anime.findUnique({ where: { id: hit.id } }) : null;
}

function mapCategory(type: string | undefined): { category: "movie" | "series" | "anime" | "cartoon"; contentType: "movie" | "series" } | null {
  switch (type) {
    case "anime":
      return { category: "anime", contentType: "movie" };
    case "anime-serial":
      return { category: "anime", contentType: "series" };
    case "foreign-serial":
    case "russian-serial":
    case "documentary-serial":
      return { category: "series", contentType: "series" };
    case "cartoon-serial":
      return { category: "cartoon", contentType: "series" };
    case "foreign-movie":
    case "russian-movie":
    case "multi-part-film":
      return { category: "movie", contentType: "movie" };
    case "foreign-cartoon":
    case "russian-cartoon":
    case "soviet-cartoon":
      return { category: "cartoon", contentType: "movie" };
    default:
      return null;
  }
}

function materialGenres(result: KodikResult) {
  const list = result.material_data?.genres || result.material_data?.all_genres || [];
  return [...new Set(list.map((value) => cleanText(value, 50)).filter(Boolean))].slice(0, 10);
}

function statusFromKodik(value?: string) {
  switch (value) {
    case "released": return "finished";
    case "anons": return "announced";
    case "ongoing": return "ongoing";
    default: return "ongoing";
  }
}

async function ensureGenres(names: string[]) {
  let created = 0;
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const exists = await prisma.genre.findUnique({ where: { slug } });
    if (!exists) {
      await prisma.genre.create({ data: { name, slug } });
      created += 1;
    }
  }
  return created;
}

function sourceData(result: KodikResult) {
  const link = normalizedKodikLink(result.link);
  if (!link) return null;
  const seasons = result.seasons && typeof result.seasons === "object" ? result.seasons : null;
  return {
    link,
    translationId: Number.isInteger(result.translation?.id) ? result.translation?.id : null,
    translationTitle: cleanText(result.translation?.title, 120) || null,
    translationType: cleanText(result.translation?.type, 30) || null,
    quality: cleanText(result.quality, 80) || null,
    camrip: Boolean(result.camrip),
    kodikUpdatedAt: dateFromKodik(result.updated_at),
    lastSeason: Number.isInteger(result.last_season) ? result.last_season : null,
    lastEpisode: Number.isInteger(result.last_episode) ? result.last_episode : null,
    episodesCount: Number.isInteger(result.episodes_count) ? result.episodes_count : null,
    seasonsJson: seasons ? (seasons as any) : null,
  };
}

async function upsertKodikSource(animeId: string, result: KodikResult) {
  const data = sourceData(result);
  if (!data) return false;
  await prisma.kodikSource.upsert({
    where: { animeId_kodikId: { animeId, kodikId: result.id } },
    update: data,
    create: { animeId, kodikId: result.id, ...data },
  });
  return true;
}

async function slugForKodik(title: string, kodikId: string) {
  const base = `kodik-${slugify(title).slice(0, 42) || "title"}`;
  const hash = Array.from(kodikId).reduce((acc, char) => ((acc * 33 + char.charCodeAt(0)) >>> 0), 5381).toString(36).slice(0, 8);
  let slug = `${base}-${hash}`.slice(0, 60);
  let i = 2;
  while (await prisma.anime.findUnique({ where: { slug } })) slug = `${base}-${hash}-${i++}`.slice(0, 60);
  return slug;
}

async function applyResult(result: KodikResult): Promise<{ kind: "skip" | "imported" | "updated" | "attached"; episodes: number }> {
  const mapped = mapCategory(result.type);
  if (!mapped) return { kind: "skip", episodes: 0 };
  const title = cleanText(result.material_data?.anime_title || result.material_data?.title || result.title || result.title_orig, 120);
  if (!title || !result.link) return { kind: "skip", episodes: 0 };
  const genres = materialGenres(result);
  await ensureGenres(genres);

  const poster = normalizedKodikLink(result.material_data?.anime_poster_url || result.material_data?.poster_url || result.screenshots?.[0] || null);
  const description = cleanText(result.material_data?.anime_description || result.material_data?.description, 5000) || null;
  const originalTitle = cleanText(result.material_data?.title_en || result.title_orig, 120) || null;
  const existing = await findExisting(result);
  const sourceKey = `kodik:${result.id}`;

  let anime;
  let kind: "imported" | "updated" | "attached" = "imported";
  if (!existing) {
    anime = await prisma.anime.create({
      data: {
        slug: await slugForKodik(title, result.id),
        title,
        originalTitle,
        description,
        posterUrl: poster,
        backgroundUrl: poster,
        year: Number.isInteger(result.year) ? result.year : null,
        genres: genres.length ? genres.join(",") : null,
        status: statusFromKodik(result.material_data?.anime_status || result.material_data?.all_status),
        type: mapped.contentType,
        category: mapped.category,
        source: "kodik",
        sourceKey,
        kinopoiskId: result.kinopoisk_id || null,
        imdbId: result.imdb_id || null,
        shikimoriId: result.shikimori_id || null,
        videoUrl: mapped.contentType === "movie" ? normalizedKodikLink(result.link) : null,
        kodikUpdatedAt: dateFromKodik(result.updated_at),
      },
    });
  } else {
    kind = existing.source === "tmdb" || existing.source === "tmdb+kodik" ? "updated" : "attached";
    const sourceValue = existing.source === "manual" ? "manual" : existing.source === "tmdb" ? "tmdb+kodik" : existing.source === "tmdb+kodik" ? "tmdb+kodik" : "kodik";
    anime = await prisma.anime.update({
      where: { id: existing.id },
      data: {
        title: existing.source === "manual" ? existing.title : title,
        originalTitle: existing.originalTitle || originalTitle,
        kinopoiskId: existing.kinopoiskId || result.kinopoisk_id || null,
        imdbId: existing.imdbId || result.imdb_id || null,
        shikimoriId: existing.shikimoriId || result.shikimori_id || null,
        kodikUpdatedAt: dateFromKodik(result.updated_at) || existing.kodikUpdatedAt,
        ...(existing.source === "manual" ? {} : {
          description: existing.description || description,
          posterUrl: existing.posterUrl || poster,
          backgroundUrl: existing.backgroundUrl || poster,
          year: existing.year || (Number.isInteger(result.year) ? result.year : null),
          genres: existing.genres || (genres.length ? genres.join(",") : null),
          status: existing.status || statusFromKodik(result.material_data?.anime_status || result.material_data?.all_status),
          type: mapped.contentType,
          category: mapped.category,
          source: sourceValue,
          sourceKey: existing.sourceKey || sourceKey,
          videoUrl: mapped.contentType === "movie" ? (existing.videoUrl || normalizedKodikLink(result.link)) : existing.videoUrl,
        }),
      },
    });
  }

  await upsertKodikSource(anime.id, result);
  const episodeCount = result.seasons
    ? Object.values(result.seasons).reduce((sum, season) => sum + Object.keys(season.episodes || {}).length, 0)
    : 0;

  return { kind, episodes: episodeCount };
}

async function fetchRecent(types: string, limit = 24) {
  const response = await kodikPost<KodikResponse>("/list", {
    limit: Math.min(limit, 100),
    types,
    sort: "updated_at",
    order: "desc",
    with_material_data: true,
    with_episodes_data: true,
  });
  return response.results || [];
}

async function fetchAllPages(types: string, maxPages: number) {
  const results: KodikResult[] = [];
  let nextPage: string | null = null;
  let page = 0;
  do {
    const response = await kodikPost<KodikResponse>(nextPage || "/list", nextPage ? {} : {
      limit: 100,
      types,
      sort: "updated_at",
      order: "desc",
      with_material_data: true,
      with_episodes_data: true,
    });
    results.push(...(response.results || []));
    nextPage = response.next_page || null;
    page += 1;
  } while (nextPage && page < maxPages);
  return results;
}

export async function syncKodikCatalog(): Promise<KodikSyncResult> {
  const animeMaxPages = Math.max(1, Number(process.env.KODIK_ANIME_MAX_PAGES || 50));
  // Для аниме читаем несколько страниц, чтобы старые тайтлы не зависели от updated_at.
  // Фильмы/сериалы пока оставляем на свежей выборке: позже их переведём на CDNvideoHub.
  const [movies, series, anime] = await Promise.all([
    fetchRecent("foreign-movie,russian-movie,multi-part-film,foreign-cartoon,russian-cartoon,soviet-cartoon"),
    fetchRecent("foreign-serial,russian-serial,cartoon-serial,documentary-serial"),
    fetchAllPages("anime,anime-serial", animeMaxPages),
  ]);

  const all = [...movies, ...series, ...anime];
  let imported = 0;
  let updated = 0;
  let attached = 0;
  let episodes = 0;
  const uniqueIds = new Set<string>();
  for (const result of all) {
    const key = result.id;
    if (uniqueIds.has(key)) continue;
    uniqueIds.add(key);
    const outcome = await applyResult(result);
    if (outcome.kind === "imported") imported += 1;
    if (outcome.kind === "updated") updated += 1;
    if (outcome.kind === "attached") attached += 1;
    episodes += outcome.episodes;
  }

  const translations = await prisma.kodikSource.count();
  return {
    imported,
    updated,
    attached,
    movies: all.filter((x) => mapCategory(x.type)?.category === "movie").length,
    series: all.filter((x) => mapCategory(x.type)?.category === "series").length,
    anime: all.filter((x) => mapCategory(x.type)?.category === "anime").length,
    cartoons: all.filter((x) => mapCategory(x.type)?.category === "cartoon").length,
    translations,
    episodes,
  };
}

export function kodikSeasons(value: unknown): Array<{ number: number; link: string | null; episodes: Array<{ number: number; link: string; title: string | null }> }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const result: Array<{ number: number; link: string | null; episodes: Array<{ number: number; link: string; title: string | null }> }> = [];
  for (const [seasonKey, rawSeason] of Object.entries(value as Record<string, any>)) {
    const number = Number(seasonKey);
    if (!Number.isInteger(number) || !rawSeason || typeof rawSeason !== "object") continue;
    const seasonLink = normalizedKodikLink(rawSeason.link || null);
    const episodes: Array<{ number: number; link: string; title: string | null }> = [];
    for (const [episodeKey, rawEpisode] of Object.entries(rawSeason.episodes || {})) {
      const episodeNumber = Number(episodeKey);
      const episodeLink = normalizedKodikLink((rawEpisode as any)?.link || null);
      if (!Number.isInteger(episodeNumber) || !episodeLink) continue;
      episodes.push({ number: episodeNumber, link: episodeLink, title: cleanText((rawEpisode as any)?.title, 120) || null });
    }
    episodes.sort((a, b) => a.number - b.number);
    result.push({ number, link: seasonLink, episodes });
  }
  return result.sort((a, b) => a.number - b.number);
}
