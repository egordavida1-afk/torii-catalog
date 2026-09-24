import { prisma } from "@/lib/prisma";

type AniLibertyRelease = {
  id: number;

  type?: {
    value?: string;
  };

  year?: number | null;

  name?: {
    main?: string | null;
    english?: string | null;
    alternative?: string | null;
  };

  description?: string | null;

  poster?: {
    optimized?: {
      src?: string | null;
    };
    src?: string | null;
    preview?: string | null;
  };

  episodes_total?: number | null;

  external_player?: string | null;

  is_ongoing?: boolean;

  genres?: Array<{
    name?: string | null;
  }>;

  shikimori?: {
    id?: number | null;
  };
};

type AniLibertyResponse = {
  data?: AniLibertyRelease[];

  meta?: {
    pagination?: {
      total?: number;
      total_pages?: number;
      current_page?: number;
      per_page?: number;
    };
  };
};

const API_BASE = "https://anilibria.top/api/v1";
const PAGE_SIZE = 50;

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function slugify(value: string) {
  return normalize(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeSlug(title: string, id: number) {
  const base = slugify(title) || "anime";
  return `${base}-${id}`;
}

function posterUrl(
  poster: AniLibertyRelease["poster"]
) {
  const raw =
    poster?.optimized?.src ||
    poster?.src ||
    poster?.preview ||
    null;

  if (!raw) {
    return null;
  }

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://")
  ) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  return `https://anilibria.top/${raw.replace(/^\/+/, "")}`;
}

function playerUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const url = value.trim();

  if (!url) {
    return null;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return url;
}

function mappedType(
  value?: string
): {
  type: "movie" | "series";
  category: "anime";
} | null {
  switch (value) {
    case "MOVIE":
      return {
        type: "movie",
        category: "anime",
      };

    case "TV":
    case "ONA":
    case "WEB":
    case "OVA":
    case "OAD":
    case "SPECIAL":
    case "DORAMA":
      return {
        type: "series",
        category: "anime",
      };

    default:
      return null;
  }
}

async function findExisting(
  item: AniLibertyRelease
) {
  const sourceKey = `aniliberty:${item.id}`;

  /*
   * Основной и самый надёжный способ:
   * идентификатор самого релиза AniLiberty.
   */
  const bySourceKey =
    await prisma.anime.findUnique({
      where: {
        sourceKey,
      },
    });

  if (bySourceKey) {
    return bySourceKey;
  }

  /*
   * Если запись была создана раньше до появления
   * sourceKey, пытаемся связать её по Shikimori.
   */
  const shikimoriId =
    item.shikimori?.id
      ? String(item.shikimori.id)
      : null;

  if (shikimoriId) {
    const byShikimori =
      await prisma.anime.findFirst({
        where: {
          shikimoriId,
          category: "anime",
        },
      });

    if (byShikimori) {
      return byShikimori;
    }
  }

  /*
   * Последний fallback — точное совпадение названия
   * в пределах того же года.
   *
   * Это используется только для старых записей,
   * у которых ещё нет sourceKey.
   */
  const title = normalize(
    item.name?.main || ""
  );

  if (!title) {
    return null;
  }

  const candidates =
    await prisma.anime.findMany({
      where: {
        category: "anime",
        ...(item.year
          ? {
              year: item.year,
            }
          : {}),
      },

      select: {
        id: true,
        slug: true,
        title: true,
        originalTitle: true,
        description: true,
        posterUrl: true,
        backgroundUrl: true,
        year: true,
        genres: true,
        status: true,
        type: true,
        category: true,
        source: true,
        sourceKey: true,
        videoUrl: true,
        shikimoriId: true,
      },

      take: 100,
    });

  return (
    candidates.find(
      (row) =>
        normalize(row.title) === title ||
        normalize(
          row.originalTitle || ""
        ) === title
    ) || null
  );
}

async function fetchPage(
  page: number
): Promise<AniLibertyResponse> {
  const url = new URL(
    `${API_BASE}/anime/catalog/releases`
  );

  url.searchParams.set(
    "page",
    String(page)
  );

  url.searchParams.set(
    "limit",
    String(PAGE_SIZE)
  );

  const response = await fetch(
    url.toString(),
    {
      headers: {
        accept: "application/json",
      },

      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `AniLiberty API HTTP ${response.status} на странице ${page}`
    );
  }

  return (await response.json()) as AniLibertyResponse;
}

async function applyRelease(
  item: AniLibertyRelease
) {
  const mapped = mappedType(
    item.type?.value
  );

  const title =
    item.name?.main?.trim();

  if (!mapped || !title) {
    return {
      skipped: true,
      created: false,
      updated: false,
    };
  }

  const poster = posterUrl(
    item.poster
  );

  const externalPlayer =
    playerUrl(
      item.external_player
    );

  const genres = [
    ...new Set(
      (item.genres || [])
        .map(
          (genre) =>
            genre.name?.trim()
        )
        .filter(
          (
            name
          ): name is string =>
            Boolean(name)
        )
    ),
  ].slice(0, 10);

  const shikimoriId =
    item.shikimori?.id
      ? String(item.shikimori.id)
      : null;

  const sourceKey =
    `aniliberty:${item.id}`;

  const existing =
    await findExisting(item);

  /*
   * Для записей, принадлежащих AniLiberty,
   * обновляем каталог свежими данными.
   *
   * Для manual-записей не меняем slug/source,
   * чтобы не ломать существующие ссылки.
   */
  if (
    existing &&
    existing.source === "manual"
  ) {
    await prisma.anime.update({
      where: {
        id: existing.id,
      },

      data: {
        title,

        originalTitle:
          item.name?.english?.trim() ||
          item.name?.alternative?.trim() ||
          existing.originalTitle ||
          null,

        description:
          item.description?.trim() ||
          existing.description ||
          null,

        posterUrl:
          existing.posterUrl ||
          poster,

        backgroundUrl:
          existing.backgroundUrl ||
          poster,

        year:
          item.year ??
          existing.year ??
          null,

        genres:
          genres.length > 0
            ? genres.join(",")
            : existing.genres ||
              null,

        shikimoriId:
          existing.shikimoriId ||
          shikimoriId,
      },
    });

    return {
      skipped: false,
      created: false,
      updated: true,
    };
  }

  const data = {
    slug: makeSlug(
      title,
      item.id
    ),

    title,

    originalTitle:
      item.name?.english?.trim() ||
      item.name?.alternative?.trim() ||
      null,

    description:
      item.description?.trim() ||
      null,

    posterUrl: poster,

    /*
     * У AniLiberty в этом ответе нет
     * отдельного background-поля.
     * Поэтому пока используем poster.
     */
    backgroundUrl: poster,

    year:
      item.year ?? null,

    genres:
      genres.length > 0
        ? genres.join(",")
        : null,

    status:
      item.is_ongoing
        ? "ongoing"
        : "finished",

    type: mapped.type,

    category:
      mapped.category,

    source:
      "aniliberty",

    sourceKey,

    shikimoriId,

    /*
     * Для сериалов видео обслуживается
     * Kodik/эпизодами.
     * Для фильмов можем сохранить
     * внешний player AniLiberty.
     */
    videoUrl:
      mapped.type === "movie"
        ? externalPlayer
        : null,
  };

  if (!existing) {
    await prisma.anime.create({
      data,
    });

    return {
      skipped: false,
      created: true,
      updated: false,
    };
  }

  await prisma.anime.update({
    where: {
      id: existing.id,
    },

    data: {
      slug: data.slug,

      title: data.title,

      originalTitle:
        data.originalTitle,

      description:
        data.description,

      posterUrl:
        data.posterUrl,

      backgroundUrl:
        data.backgroundUrl,

      year:
        data.year,

      genres:
        data.genres,

      status:
        data.status,

      type:
        data.type,

      category:
        data.category,

      source:
        "aniliberty",

      sourceKey:
        data.sourceKey,

      shikimoriId:
        data.shikimoriId,

      videoUrl:
        data.videoUrl,
    },
  });

  return {
    skipped: false,
    created: false,
    updated: true,
  };
}

export type AniLibertySyncResult = {
  total: number;
  pages: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
};

export async function syncAniLibertyCatalog(): Promise<AniLibertySyncResult> {
  /*
   * Получаем первую страницу, чтобы узнать
   * актуальное количество страниц каталога.
   */
  const first =
    await fetchPage(1);

  const pagination =
    first.meta?.pagination;

  const totalPages =
    Math.max(
      1,
      Number(
        pagination?.total_pages ||
          1
      )
    );

  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  /*
   * Обрабатываем страницу сразу после получения.
   *
   * Не складываем все 39 страниц
   * в память перед записью.
   */
  const processPage = async (
    response: AniLibertyResponse
  ) => {
    for (
      const item of
      response.data || []
    ) {
      const result =
        await applyRelease(item);

      if (result.skipped) {
        skipped += 1;
        continue;
      }

      processed += 1;

      if (result.created) {
        created += 1;
      }

      if (result.updated) {
        updated += 1;
      }
    }
  };

  await processPage(first);

  for (
    let page = 2;
    page <= totalPages;
    page += 1
  ) {
    const response =
      await fetchPage(page);

    await processPage(
      response
    );
  }

  return {
    total:
      Number(
        pagination?.total ||
          processed
      ),

    pages:
      totalPages,

    processed,
    created,
    updated,
    skipped,
  };
}
