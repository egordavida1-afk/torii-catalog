import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/user-auth";
import { kodikSeasons } from "@/lib/kodik";
import { normalizeVideoUrl, statusLabel, typeLabel } from "@/lib/utils";
import { toggleFavorite } from "@/app/favorites/actions";

export const dynamic = "force-dynamic";

export default async function AnimePage({ params, searchParams }: { params: { slug: string }; searchParams: { season?: string; ep?: string; kodik?: string } }) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/anime/${params.slug}`)}`);

  const anime = await prisma.anime.findUnique({
    where: { slug: params.slug },
    include: {
      seasons: { include: { episodes: true }, orderBy: { number: "asc" } },
      kodikSources: { orderBy: [{ translationType: "asc" }, { updatedAt: "desc" }] },
    },
  });
  if (!anime) notFound();

  const favorite = await prisma.favorite.findUnique({
    where: { userId_animeId: { userId: user.id, animeId: anime.id } },
    select: { id: true },
  });

  const genres = anime.genres ? anime.genres.split(",").map((g) => g.trim()).filter(Boolean) : [];
  const seasons = anime.seasons.map((s) => ({ ...s, episodes: [...s.episodes].sort((a, b) => a.number - b.number) }));
  const kodikSources = [...anime.kodikSources].sort((a, b) => {
    const aVoice = a.translationType === "voice" ? 0 : 1;
    const bVoice = b.translationType === "voice" ? 0 : 1;
    return aVoice - bVoice || (b.updatedAt.getTime() - a.updatedAt.getTime());
  });
  const selectedSource = kodikSources.find((source) => source.id === searchParams.kodik) ?? kodikSources[0];
  const kodikSeasonList = selectedSource ? kodikSeasons(selectedSource.seasonsJson) : [];
  const hasKodikEpisodes = kodikSeasonList.some((season) => season.episodes.length > 0);
  const activeKodikSeason = kodikSeasonList.find((s) => s.number === Number(searchParams.season)) ?? kodikSeasonList[0];
  const activeKodikEpisode = activeKodikSeason?.episodes.find((e) => e.number === Number(searchParams.ep)) ?? activeKodikSeason?.episodes[0];
  const hasLocalPlayback = anime.type === "movie" ? Boolean(anime.videoUrl) : seasons.length > 0;
  const shouldUseKodik = !hasLocalPlayback && Boolean(selectedSource);
  const movieVideo = anime.type === "movie" ? (anime.videoUrl || (selectedSource?.link ?? null)) : null;

  return (
    <div className="title-page" style={anime.backgroundUrl ? { backgroundImage: `linear-gradient(90deg, rgba(18,17,26,.98) 0%, rgba(18,17,26,.84) 42%, rgba(18,17,26,.50) 100%), url(${JSON.stringify(anime.backgroundUrl)})` } : undefined}>
      <div className="title-page-inner">
        <Link href="/catalog" className="back-link">← Вернуться в каталог</Link>
        <div className="title-hero">
          <img src={anime.posterUrl || "https://placehold.co/300x450/1c1a26/a9a3b5?text=Постер"} alt={anime.title} />
          <div>
            <div className="eyebrow">{typeLabel(anime.type)}</div>
            <h1>{anime.title}</h1>
            <div className="title-meta">
              <span className="pill">{statusLabel(anime.status)}</span>
              {anime.year && <span className="pill">{anime.year}</span>}
              {genres.map((g) => <span className="pill" key={g}>{g}</span>)}
            </div>
            {anime.description && <p className="title-desc">{anime.description}</p>}
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
          movieVideo ? <div className="player-wrap"><Player videoUrl={movieVideo} /></div> : <div className="empty-state">Для этого фильма пока нет источника просмотра.</div>
        ) : hasLocalPlayback ? (
          <LocalPlayback anime={anime} seasons={seasons} searchParams={searchParams} />
        ) : shouldUseKodik ? (
          <KodikPlayback source={selectedSource!} seasons={kodikSeasonList} activeSeason={activeKodikSeason} activeEpisode={activeKodikEpisode} hasEpisodes={hasKodikEpisodes} />
        ) : (
          <div className="empty-state">Для этого сериала пока нет источника просмотра.</div>
        )}
      </div>
    </div>
  );
}

function LocalPlayback({ anime, seasons, searchParams }: { anime: any; seasons: any[]; searchParams: { season?: string; ep?: string } }) {
  const activeSeason = seasons.find((s) => s.number === Number(searchParams.season)) ?? seasons[0];
  const activeEpisode = activeSeason?.episodes.find((e: any) => e.number === Number(searchParams.ep)) ?? activeSeason?.episodes[0];
  if (!activeEpisode) return <div className="empty-state">В этом сезоне пока нет серий.</div>;
  return (
    <>
      {seasons.length > 1 && <div className="season-tabs">{seasons.map((s) => <Link key={s.id} href={`/anime/${anime.slug}?season=${s.number}`} className={s.id === activeSeason?.id ? "active" : ""}>{s.title || `Сезон ${s.number}`}</Link>)}</div>}
      <div className="player-wrap"><Player videoUrl={activeEpisode.videoUrl} /></div>
      <div className="episode-list">
        {activeSeason.episodes.map((ep: any) => (
          <Link key={ep.id} href={`/anime/${anime.slug}?season=${activeSeason.number}&ep=${ep.number}`} className={`episode-row ${ep.id === activeEpisode.id ? "active" : ""}`}>
            <span className="num">{String(ep.number).padStart(2, "0")}</span>
            <span className="name">{ep.title || `Серия ${ep.number}`}</span>
            {ep.duration && <span className="dur">{ep.duration} мин</span>}
          </Link>
        ))}
      </div>
    </>
  );
}

function KodikPlayback({ source, seasons, activeSeason, activeEpisode, hasEpisodes }: { source: any; seasons: ReturnType<typeof kodikSeasons>; activeSeason?: ReturnType<typeof kodikSeasons>[number]; activeEpisode?: ReturnType<typeof kodikSeasons>[number]["episodes"][number]; hasEpisodes: boolean }) {
  const playerUrl = activeEpisode?.link || activeSeason?.link || source.link;
  return (
    <>
      {seasons.length > 1 && <div className="season-tabs">{seasons.map((s) => <Link key={s.number} href={`?kodik=${encodeURIComponent(source.id)}&season=${s.number}`} className={s.number === activeSeason?.number ? "active" : ""}>Сезон {s.number}</Link>)}</div>}
      {playerUrl && <div className="player-wrap"><Player videoUrl={playerUrl} /></div>}
      {hasEpisodes && activeSeason?.episodes.length ? (
        <div className="episode-list">
          {activeSeason.episodes.map((ep) => (
            <Link key={ep.number} href={`?kodik=${encodeURIComponent(source.id)}&season=${activeSeason.number}&ep=${ep.number}`} className={`episode-row ${ep.number === activeEpisode?.number ? "active" : ""}`}>
              <span className="num">{String(ep.number).padStart(2, "0")}</span>
              <span className="name">{ep.title || `Серия ${ep.number}`}</span>
            </Link>
          ))}
        </div>
      ) : <p className="meta playback-note">Плеер Kodik сам предоставляет выбор доступных серий для этого источника.</p>}
    </>
  );
}

function Player({ videoUrl }: { videoUrl: string }) {
  const { type, src } = normalizeVideoUrl(videoUrl);
  if (type === "iframe") return <iframe src={src} title="player" allowFullScreen allow="autoplay *; fullscreen *" referrerPolicy="strict-origin-when-cross-origin" />;
  return <video src={src} controls playsInline preload="metadata">Ваш браузер не поддерживает видео.</video>;
}
