import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import WatchVideo from "@/app/components_WatchVideo";
import CinemaMode from "@/app/components_CinemaMode";
import EpisodeStartTracker from "@/app/components_EpisodeStartTracker";
import { markEpisodeWatched } from "@/app/watch/actions";
import { kodikSeasons } from "@/lib/kodik";
import { resolveAnimeWithParsers, type AnimeParserFallback } from "@/lib/anime-parsers";
import { categoryLabel, normalizeVideoUrl, statusLabel, typeLabel } from "@/lib/utils";
import { toggleFavorite } from "@/app/favorites/actions";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const anime = await prisma.anime.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      description: true,
      posterUrl: true,
      type: true,
    },
  });

  if (!anime) {
    return {
      title: "Страница не найдена | TORII",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://torii-catalog.vercel.app";

  const canonical = `${siteUrl}/anime/${params.slug}`;
  const description =
    anime.description?.trim() ||
    `${anime.title} — смотреть онлайн на TORII. Фильмы, сериалы, аниме и мультфильмы.`;

  return {
    title: anime.title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: anime.title,
      description,
      url: canonical,
      siteName: "TORII",
      type: anime.type === "movie" ? "video.movie" : "video.tv_show",
      images: anime.posterUrl
        ? [
            {
              url: anime.posterUrl,
              alt: anime.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: anime.title,
      description,
      images: anime.posterUrl ? [anime.posterUrl] : undefined,
    },
  };
}

export default async function AnimePage({ params, searchParams }: { params: { slug: string }; searchParams: { season?: string; ep?: string; kodik?: string } }) {
  const user = await getCurrentUser();


  const anime = await prisma.anime.findUnique({
    where: { slug: params.slug },
    include: {
      seasons: { include: { episodes: true }, orderBy: { number: "asc" } },
      kodikSources: { orderBy: [{ translationType: "asc" }, { updatedAt: "desc" }] },
    },
  });
  if (!anime) notFound();

  const [favorite, watchRows] = user
    ? await Promise.all([
        prisma.favorite.findUnique({
          where: { userId_animeId: { userId: user.id, animeId: anime.id } },
          select: { id: true },
        }),
        prisma.watchProgress.findMany({
          where: { userId: user.id, animeId: anime.id },
          orderBy: { updatedAt: "desc" },
        }),
      ])
    : [null, []];

  const parserFallback: AnimeParserFallback | null =
    !anime.posterUrl || anime.kodikSources.length === 0
      ? await resolveAnimeWithParsers(anime.title, 1, Number(searchParams.ep) || 1)
      : null;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://torii-catalog.vercel.app";

  const schemaData = {
    "@context": "https://schema.org",
    "@type": anime.type === "movie" ? "Movie" : "TVSeries",
    name: anime.title,
    description:
      anime.description?.trim() ||
      `${anime.title} — смотреть онлайн на TORII.`,
    image: anime.posterUrl ? [anime.posterUrl] : undefined,
    url: `${siteUrl}/anime/${anime.slug}`,
  };
  const genres = anime.genres ? anime.genres.split(",").map((g) => g.trim()).filter(Boolean) : (parserFallback?.genres || []);
  const seasons = anime.seasons.map((s) => ({ ...s, episodes: [...s.episodes].sort((a, b) => a.number - b.number) }));
  const latestProgress = watchRows.find((row) => !row.completed) ?? null;
  const watchedKeys = new Set<string>(watchRows.filter((row) => row.completed).map((row) => `${row.seasonNumber}:${row.episodeNumber}`));
  const kodikSources = [...anime.kodikSources].sort((a, b) => {
    const aVoice = a.translationType === "voice" ? 0 : 1;
    const bVoice = b.translationType === "voice" ? 0 : 1;
    return aVoice - bVoice || (b.updatedAt.getTime() - a.updatedAt.getTime());
  });
  const selectedSource = kodikSources.find((source) => source.id === searchParams.kodik) ?? kodikSources[0];
  const parserSource = parserFallback?.sources.find((source) => source.embed || source.stream) ?? parserFallback?.sources[0];
  const parserVideoUrl = parserSource?.stream?.MP4s?.[parserSource.stream.MP4s.length - 1] || parserSource?.embed || parserSource?.stream?.HLS || parserSource?.stream?.DASH || null;
  const kodikSeasonList = selectedSource ? kodikSeasons(selectedSource.seasonsJson) : [];
  const hasKodikEpisodes = kodikSeasonList.some((season) => season.episodes.length > 0);
  const localEpisodeCount = seasons.reduce((sum, season) => sum + season.episodes.length, 0);
  const kodikEpisodeCount = kodikSeasonList.reduce((sum, season) => sum + season.episodes.length, 0);
  const totalEpisodeCount = Math.max(localEpisodeCount, kodikEpisodeCount, anime.type === "movie" ? 1 : 0);
  const completedEpisodeCount = new Set(
    watchRows.filter((row) => row.completed).map((row) => `${row.seasonNumber}:${row.episodeNumber}`)
  ).size;
  const currentProgressRow = watchRows.find((row) => !row.completed) ?? null;
  const partialEpisode = currentProgressRow?.durationSeconds
    ? Math.max(0, Math.min(0.999, currentProgressRow.positionSeconds / currentProgressRow.durationSeconds))
    : 0;
  const overallWatchPercent = totalEpisodeCount
    ? Math.max(0, Math.min(100, Math.round(((completedEpisodeCount + partialEpisode) / totalEpisodeCount) * 100)))
    : 0;
  const requestedSeason = Number(searchParams.season);
  const requestedEpisode = Number(searchParams.ep);
  const resumeSeason = latestProgress?.seasonNumber || 0;
  const resumeEpisode = latestProgress?.episodeNumber || 0;
  const activeKodikSeason = kodikSeasonList.find((s) => s.number === (Number.isInteger(requestedSeason) && requestedSeason > 0 ? requestedSeason : resumeSeason)) ?? kodikSeasonList[0];
  const activeKodikEpisode = activeKodikSeason?.episodes.find((e) => e.number === (Number.isInteger(requestedEpisode) && requestedEpisode > 0 ? requestedEpisode : resumeEpisode)) ?? activeKodikSeason?.episodes[0];
  const hasLocalPlayback = anime.type === "movie" ? Boolean(anime.videoUrl) : seasons.length > 0;
  const shouldUseKodik = !hasLocalPlayback && Boolean(selectedSource);
  const shouldUseParserFallback = !hasLocalPlayback && !shouldUseKodik && Boolean(parserSource);
  const movieVideo = anime.type === "movie" ? (anime.videoUrl || (selectedSource?.link ?? null)) : null;


  return (
    <div className="title-page" style={anime.backgroundUrl ? { backgroundImage: `linear-gradient(90deg, rgba(18,17,26,.98) 0%, rgba(18,17,26,.84) 42%, rgba(18,17,26,.50) 100%), url(${JSON.stringify(anime.backgroundUrl)})` } : undefined}>
      <div className="title-page-inner">
        <Link href="/catalog" className="back-link">← Вернуться в каталог</Link>
        <div className="title-hero">
          <img src={anime.posterUrl || parserFallback?.image || "https://placehold.co/300x450/1c1a26/a9a3b5?text=Постер"} alt={anime.title} />
          <div>
            <div className="eyebrow">{categoryLabel(anime.category)}</div>
            <h1>{anime.title || parserFallback?.title}</h1>
            <div className="title-meta">
              <span className="pill">{statusLabel(anime.status)}</span>
              {anime.year && <span className="pill">{anime.year}</span>}
              {genres.map((g) => <span className="pill" key={g}>{g}</span>)}
            </div>
            {(anime.description || parserFallback?.description) && <p className="title-desc">{anime.description || parserFallback?.description}</p>}
            {totalEpisodeCount > 0 && (completedEpisodeCount > 0 || currentProgressRow) && (
              <div className="title-progress">
                <div className="title-progress-head">
                  <span>Прогресс просмотра</span>
                  <strong>{overallWatchPercent}%</strong>
                </div>
                <div className="title-progress-bar" aria-label={`Просмотрено ${overallWatchPercent}%`}>
                  <span style={{ width: `${overallWatchPercent}%` }} />
                </div>
              </div>
            )}
            <form action={toggleFavorite.bind(null, anime.id, anime.slug)} className="favorite-form">
              <button type="submit" className={`favorite-button ${favorite ? "is-favorite" : ""}`}>
                <span aria-hidden="true">{favorite ? "♥" : "♡"}</span> {favorite ? "В избранном" : "Добавить в избранное"}
              </button>
            </form>
          </div>
        </div>

        {kodikSources.length > 1 && (
          <div className="panel playback-source-panel">
            <div className="panel-head"><div><h2>Озвучка / источник</h2><p className="meta">Выбери доступный вариант Kodik.</p></div></div>
            <div className="source-tabs">
              {kodikSources.slice(0, 20).map((source) => (
                <Link
                  key={source.id}
                  href={`?kodik=${encodeURIComponent(source.id)}${searchParams.season ? `&season=${encodeURIComponent(searchParams.season)}` : ""}${searchParams.ep ? `&ep=${encodeURIComponent(searchParams.ep)}` : ""}`}
                  className={source.id === selectedSource?.id ? "active" : ""}
                >
                  {source.translationTitle || "Kodik"}{source.translationType === "subtitles" ? " · субтитры" : ""}
                </Link>
              ))}
            </div>
          </div>
        )}

        {anime.type === "movie" ? (
          movieVideo ? <CinemaMode><div className="player-wrap"><Player videoUrl={movieVideo} animeId={anime.id} seasonNumber={0} episodeNumber={0} progress={watchRows.find((row) => row.seasonNumber === 0 && row.episodeNumber === 0) ?? null} /></div></CinemaMode> : <div className="empty-state">Для этого фильма пока нет источника просмотра.</div>
        ) : hasLocalPlayback ? (
          <LocalPlayback anime={anime} seasons={seasons} searchParams={searchParams} progressRows={watchRows} />
        ) : shouldUseKodik ? (
          <KodikPlayback animeId={anime.id} source={selectedSource!} seasons={kodikSeasonList} activeSeason={activeKodikSeason} activeEpisode={activeKodikEpisode} hasEpisodes={hasKodikEpisodes} watchedKeys={watchedKeys} progressRows={watchRows} />
        ) : shouldUseParserFallback ? (
          <ParserFallbackPlayback animeId={anime.id} source={parserSource!} seasonNumber={Number(searchParams.season) || 1} episodeNumber={Number(searchParams.ep) || 1} progressRows={watchRows} />
        ) : (
          <div className="empty-state">Для этого сериала пока нет источника просмотра.</div>
        )}
      </div>
    </div>
  );
}

function LocalPlayback({ anime, seasons, searchParams, progressRows }: { anime: any; seasons: any[]; searchParams: { season?: string; ep?: string }; progressRows: any[] }) {
  const latestProgress = progressRows.find((row) => !row.completed) ?? null;
  const requestedSeason = Number(searchParams.season);
  const requestedEpisode = Number(searchParams.ep);
  const targetSeason = Number.isInteger(requestedSeason) && requestedSeason > 0 ? requestedSeason : latestProgress?.seasonNumber || 0;
  const activeSeason = seasons.find((s) => s.number === targetSeason) ?? seasons[0];
  const targetEpisode = Number.isInteger(requestedEpisode) && requestedEpisode > 0 ? requestedEpisode : latestProgress?.episodeNumber || 0;
  const activeEpisode = activeSeason?.episodes.find((e: any) => e.number === targetEpisode) ?? activeSeason?.episodes[0];
  if (!activeEpisode) return <div className="empty-state">В этом сезоне пока нет серий.</div>;
  const progress = progressRows.find((row) => row.seasonNumber === activeSeason.number && row.episodeNumber === activeEpisode.number);


  return (
    <>
      {seasons.length > 1 && <div className="season-tabs">{seasons.map((s) => <Link key={s.id} href={`/anime/${anime.slug}?season=${s.number}`} className={s.id === activeSeason?.id ? "active" : ""}>{s.title || `Сезон ${s.number}`}</Link>)}</div>}
      <CinemaMode><div className="player-wrap"><Player videoUrl={activeEpisode.videoUrl} animeId={anime.id} seasonNumber={activeSeason.number} episodeNumber={activeEpisode.number} progress={progress ?? null} /></div></CinemaMode>
      <div className="episode-list">
        {activeSeason.episodes.map((ep: any) => {
          const watched = progressRows.some((row) => row.seasonNumber === activeSeason.number && row.episodeNumber === ep.number && row.completed);

  return (
            <div key={ep.id} className={`episode-row ${ep.id === activeEpisode.id ? "active" : ""} ${watched ? "is-watched" : ""}`}>
              <Link href={`/anime/${anime.slug}?season=${activeSeason.number}&ep=${ep.number}`} className="episode-main">
                <span className="num">{watched ? "✓" : String(ep.number).padStart(2, "0")}</span>
                <span className="name">{ep.title || `Серия ${ep.number}`}</span>
                {ep.duration && <span className="dur">{ep.duration} мин</span>}
              </Link>
              {watched && <span className="episode-watched-label">Просмотрено</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ParserFallbackPlayback({ animeId, source, seasonNumber, episodeNumber, progressRows }: { animeId: string; source: AnimeParserFallback["sources"][number]; seasonNumber: number; episodeNumber: number; progressRows: any[] }) {
  const streamMp4 = source.stream?.MP4s?.[source.stream.MP4s.length - 1] || null;
  const url = streamMp4 || source.embed || source.stream?.HLS || source.stream?.DASH || null;
  if (!url) return <div className="empty-state">Источник найден, но ссылка на воспроизведение недоступна.</div>;
  const { type, src } = normalizeVideoUrl(url);

  return (
    <>
      <div className="panel playback-source-panel">
        <div className="panel-head"><div><h2>Дополнительный источник</h2><p className="meta">Источник найден через AnimeParsers · {source.label}</p></div></div>
      </div>
      <CinemaMode>
        <div className="player-wrap">
          {type === "iframe"
            ? <iframe src={src} title={`Источник ${source.label}`} allowFullScreen allow="autoplay *; fullscreen *" referrerPolicy="strict-origin-when-cross-origin" />
            : <Player videoUrl={src} animeId={animeId} seasonNumber={seasonNumber} episodeNumber={episodeNumber} progress={progressRows.find((row) => row.seasonNumber === seasonNumber && row.episodeNumber === episodeNumber) ?? null} />}
        </div>
      </CinemaMode>
    </>
  );
}

function KodikPlayback({ animeId, source, seasons, activeSeason, activeEpisode, hasEpisodes, watchedKeys, progressRows }: { animeId: string; source: any; seasons: ReturnType<typeof kodikSeasons>; activeSeason?: ReturnType<typeof kodikSeasons>[number]; activeEpisode?: ReturnType<typeof kodikSeasons>[number]["episodes"][number]; hasEpisodes: boolean; watchedKeys: Set<string>; progressRows: any[] }) {
  const playerUrl = activeEpisode?.link || activeSeason?.link || source.link;

  return (
    <>
      {activeEpisode && <EpisodeStartTracker animeId={animeId} seasonNumber={activeSeason?.number ?? 0} episodeNumber={activeEpisode.number} />}
      {seasons.length > 1 && <div className="season-tabs">{seasons.map((s) => <Link key={s.number} href={`?kodik=${encodeURIComponent(source.id)}&season=${s.number}`} className={s.number === activeSeason?.number ? "active" : ""}>Сезон {s.number}</Link>)}</div>}
      {playerUrl && <CinemaMode><div className="player-wrap"><Player videoUrl={playerUrl} animeId={animeId} seasonNumber={activeSeason?.number ?? 0} episodeNumber={activeEpisode?.number ?? 0} progress={activeEpisode ? progressRows.find((row) => row.seasonNumber === activeSeason?.number && row.episodeNumber === activeEpisode.number) ?? null : null} /></div></CinemaMode>}
      {hasEpisodes && activeSeason?.episodes.length ? (
        <div className="episode-list">
          {activeSeason.episodes.map((ep) => {
            const watched = watchedKeys.has(`${activeSeason.number}:${ep.number}`);

  return (
              <div key={ep.number} className={`episode-row ${ep.number === activeEpisode?.number ? "active" : ""} ${watched ? "is-watched" : ""}`}>
                <Link href={`?kodik=${encodeURIComponent(source.id)}&season=${activeSeason.number}&ep=${ep.number}`} className="episode-main">
                  <span className="num">{watched ? "✓" : String(ep.number).padStart(2, "0")}</span>
                  <span className="name">{ep.title || `Серия ${ep.number}`}</span>
                </Link>
                {watched ? (
                  <span className="episode-watched-label">Просмотрено</span>
                ) : (
                  <form action={markEpisodeWatched.bind(null, animeId, activeSeason.number, ep.number)} className="episode-mark-form">
                    <button type="submit" className="episode-mark-button" aria-label={`Отметить серию ${ep.number} просмотренной`}>✓</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : <p className="meta playback-note">Плеер Kodik сам предоставляет выбор доступных серий для этого источника.</p>}
    </>
  );
}

function Player({ videoUrl, animeId, seasonNumber, episodeNumber, progress }: { videoUrl: string; animeId: string; seasonNumber: number; episodeNumber: number; progress: any }) {
  const { type, src } = normalizeVideoUrl(videoUrl);
  if (type === "iframe") return <iframe src={src} title="player" allowFullScreen allow="autoplay *; fullscreen *" referrerPolicy="strict-origin-when-cross-origin" />;
  return <WatchVideo animeId={animeId} seasonNumber={seasonNumber} episodeNumber={episodeNumber} videoUrl={src} initialPosition={progress?.positionSeconds ?? 0} initialCompleted={progress?.completed ?? false} />;
}

