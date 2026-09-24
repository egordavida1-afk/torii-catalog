export type AnimeParserSource = {
  label: string;
  player: string;
  embed?: string | null;
  kind?: "embed" | "stream" | null;
  stream?: {
    HLS?: string | null;
    DASH?: string | null;
    MP4s?: string[];
    url?: string | null;
    kind?: string;
    content?: string;
  } | null;
};

export type AnimeParserFallback = {
  ok: boolean;
  found: boolean;
  query?: string | null;
  title?: string | null;
  original_title?: string | null;
  image?: string | null;
  description?: string | null;
  episodes?: number | string | null;
  genres?: string[];
  status?: string | null;
  aniliberty_id?: number | string | null;
  aniliberty_alias?: string | null;
  sources: AnimeParserSource[];
  season?: number;
  episode?: number;
};

function providerUrl() {
  if (process.env.ANIME_PARSERS_API_URL?.trim()) {
    return process.env.ANIME_PARSERS_API_URL.trim().replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/anime-parsers`;
  }

  return "http://127.0.0.1:8001";
}

export async function resolveAnimeWithParsers(
  title: string,
  season = 1,
  episode = 1
): Promise<AnimeParserFallback | null> {
  const secret = process.env.ANIME_PARSERS_SECRET?.trim();

  try {
    const response = await fetch(providerUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { "x-anime-parsers-secret": secret } : {}),
      },
      body: JSON.stringify({ title, season, episode }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as AnimeParserFallback;

    if (!data?.ok) return null;

    return data;
  } catch {
    return null;
  }
}
