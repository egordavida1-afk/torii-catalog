import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { categoryLabel, typeLabel } from "@/lib/utils";
import HeroCarousel, { type HeroItem } from "./components_HeroCarousel";

export const dynamic = "force-dynamic";

const fallbackPoster = "https://placehold.co/600x900/10121c/9ea4b8?text=TORII";

// Unicode-escaped UI labels keep Cyrillic strings intact through all build/deploy steps.
const RAIL_TITLES = {
  latest: "\u041d\u043e\u0432\u0438\u043d\u043a\u0438",
  popular: "\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435",
  continueWatching: "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440",
  myList: "\u041c\u043e\u0439 \u0441\u043f\u0438\u0441\u043e\u043a",
  movies: "\u0424\u0438\u043b\u044c\u043c\u044b",
  series: "\u0421\u0435\u0440\u0438\u0430\u043b\u044b",
  anime: "\u0410\u043d\u0438\u043c\u0435",
  cartoons: "\u041c\u0443\u043b\u044c\u0442\u0444\u0438\u043b\u044c\u043c\u044b",
  all: "\u0412\u0441\u0435",
} as const;

type CatalogItem = {
  id: string;
  slug: string;
  title: string;
  posterUrl: string | null;
  backgroundUrl: string | null;
  year: number | null;
  category: string;
  type: string;
  description: string | null;
  status: string;
  seasons: Array<{ episodes: Array<unknown> }>;
  _count: { favorites: number };
  progress?: { seasonNumber: number; episodeNumber: number; positionSeconds: number; durationSeconds: number | null };
};

export default async function HomePage() {
  const user = await getCurrentUser();
  const include = {
    seasons: { include: { episodes: true } },
    _count: { select: { favorites: true } },
  } as const;

  const [latest, popular, movies, series, anime, cartoons, favoriteRows, progressRows] = await Promise.all([
    prisma.anime.findMany({ include, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.anime.findMany({ include, orderBy: [{ favorites: { _count: "desc" } }, { createdAt: "desc" }], take: 12 }),
    prisma.anime.findMany({ include, where: { category: "movie" }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.anime.findMany({ include, where: { category: "series" }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.anime.findMany({ include, where: { category: "anime" }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.anime.findMany({ include, where: { category: "cartoon" }, orderBy: { createdAt: "desc" }, take: 12 }),
    user
      ? prisma.favorite.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { anime: { include } },
        })
      : Promise.resolve([]),
    user
      ? prisma.watchProgress.findMany({
          where: { userId: user.id, completed: false },
          orderBy: { updatedAt: "desc" },
          take: 40,
          include: { anime: { include } },
        })
      : Promise.resolve([]),
  ]);

  const favorites = favoriteRows.map((row: any) => row.anime).filter(Boolean) as CatalogItem[];
  const continueMap = new Map<string, CatalogItem>();
  for (const row of progressRows as any[]) {
    if (!row.anime || continueMap.has(row.anime.id)) continue;
    continueMap.set(row.anime.id, {
      ...row.anime,
      progress: {
        seasonNumber: row.seasonNumber,
        episodeNumber: row.episodeNumber,
        positionSeconds: row.positionSeconds,
        durationSeconds: row.durationSeconds,
      },
    });
  }
  const continueWatching = [...continueMap.values()].slice(0, 8);
  const heroItems: HeroItem[] = latest.slice(0, 6).map((item: any) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    posterUrl: item.posterUrl,
    backgroundUrl: item.backgroundUrl,
    year: item.year,
    category: item.category,
    type: item.type,
    description: item.description,
    episodes: item.seasons.reduce((n: number, season: any) => n + season.episodes.length, 0),
  }));

  return (
    <div className="home-page">
      {heroItems.length ? (
        <HeroCarousel items={heroItems} />
      ) : (
        <section className="home-empty">
          <div className="hero-eyebrow"><span className="hero-dot" /> TORII</div>
          <h1>Твоя медиатека<br />в одном месте.</h1>
          <p>Добавь тайтлы через админку — они появятся здесь красивыми подборками.</p>
          <Link href="/catalog" className="hero-button">Открыть каталог</Link>
        </section>
      )}

      <div className="home-sections">
        <CatalogRail title={RAIL_TITLES.latest} href="/catalog" items={latest as CatalogItem[]} />
        <CatalogRail title={RAIL_TITLES.popular} href="/catalog" items={popular as CatalogItem[]} />
        {continueWatching.length > 0 && <CatalogRail title={RAIL_TITLES.continueWatching} href="/catalog" items={continueWatching} showProgress />}
        {favorites.length > 0 && <CatalogRail title={RAIL_TITLES.myList} href="/favorites" items={favorites} />}
        <CatalogRail title={RAIL_TITLES.movies} href="/catalog?category=movie" items={movies as CatalogItem[]} />
        <CatalogRail title={RAIL_TITLES.series} href="/catalog?category=series" items={series as CatalogItem[]} />
        <CatalogRail title={RAIL_TITLES.anime} href="/catalog?category=anime" items={anime as CatalogItem[]} />
        <CatalogRail title={RAIL_TITLES.cartoons} href="/catalog?category=cartoon" items={cartoons as CatalogItem[]} />
      </div>
    </div>
  );
}

function CatalogRail({ title, href, items, showProgress = false }: { title: string; href: string; items: CatalogItem[]; showProgress?: boolean }) {
  if (!items.length) return null;
  return (
    <section className="home-rail">
      <div className="rail-head">
        <h2>{title}</h2>
        <Link href={href}>{RAIL_TITLES.all} <span>→</span></Link>
      </div>
      <div className="rail-track">
        {items.map((item) => <HomeCard key={item.id} item={item} showProgress={showProgress} />)}
      </div>
    </section>
  );
}

function HomeCard({ item, showProgress = false }: { item: CatalogItem; showProgress?: boolean }) {
  const episodes = item.seasons.reduce((n, season) => n + season.episodes.length, 0);
  const continueHref = item.progress
    ? `/anime/${item.slug}?${item.progress.seasonNumber > 0 ? `season=${item.progress.seasonNumber}&` : ""}ep=${item.progress.episodeNumber}`
    : `/anime/${item.slug}`;
  const progressPercent = item.progress?.durationSeconds
    ? Math.max(0, Math.min(100, Math.round((item.progress.positionSeconds / item.progress.durationSeconds) * 100)))
    : 0;
  return (
    <Link href={continueHref} className={`home-card ${showProgress ? "home-card-progress" : ""}`}>
      <div className="home-card-media">
        <img src={item.posterUrl || fallbackPoster} alt={item.title} loading="lazy" />
        <span className="home-card-overlay" aria-hidden="true" />
        <span className="home-card-tag">{categoryLabel(item.category)}</span>
        <span className="home-card-play" aria-hidden="true">▶</span>
      </div>
      <div className="home-card-title">{item.title}</div>
      <div className="home-card-meta">
        {item.progress ? (
          <>
            {item.progress.seasonNumber > 0 && <><span>Сезон {item.progress.seasonNumber}</span><span>·</span></>}
            <span>Серия {item.progress.episodeNumber}</span>
          </>
        ) : (
          <>
            <span>{item.year ?? "—"}</span><span>·</span><span>{typeLabel(item.type)}</span>
            {episodes > 0 && <><span>·</span><span>{episodes} серий</span></>}
          </>
        )}
      </div>
      {showProgress && item.progress?.durationSeconds ? (
        <div className="home-progress" aria-label={`Просмотрено ${progressPercent}%`}>
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      ) : null}
    </Link>
  );
}
