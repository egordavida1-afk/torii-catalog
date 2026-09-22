import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/user-auth";
import { normalizeVideoUrl, statusLabel, typeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnimePage({ params, searchParams }: { params: { slug: string }; searchParams: { season?: string; ep?: string } }) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/anime/${params.slug}`)}`);

  const anime = await prisma.anime.findUnique({
    where: { slug: params.slug },
    include: { seasons: { include: { episodes: true }, orderBy: { number: "asc" } } },
  });
  if (!anime) notFound();

  const genres = anime.genres ? anime.genres.split(",").map((g) => g.trim()).filter(Boolean) : [];
  const seasons = anime.seasons.map((s) => ({ ...s, episodes: [...s.episodes].sort((a, b) => a.number - b.number) }));
  const activeSeason = seasons.find((s) => s.number === Number(searchParams.season)) ?? seasons[0];
  const activeEpisode = activeSeason?.episodes.find((e) => e.number === Number(searchParams.ep)) ?? activeSeason?.episodes[0];
  const movieVideo = anime.type === "movie" ? anime.videoUrl : null;

  return (
    <div className="title-page" style={anime.backgroundUrl ? { backgroundImage: `linear-gradient(90deg, rgba(18,17,26,.98) 0%, rgba(18,17,26,.84) 42%, rgba(18,17,26,.50) 100%), url(${JSON.stringify(anime.backgroundUrl)})` } : undefined}>
      <div className="title-page-inner">
        <Link href="/" className="back-link">← Вернуться в каталог</Link>
        <div className="title-hero">
          <img src={anime.posterUrl || "https://placehold.co/300x450/1c1a26/a9a3b5?text=Постер"} alt={anime.title} />
          <div>
            <div className="eyebrow">{typeLabel(anime.type)} · просмотр открыт зарегистрированному пользователю</div>
            <h1>{anime.title}</h1>
            <div className="title-meta">
              <span className="pill">{statusLabel(anime.status)}</span>
              {anime.year && <span className="pill">{anime.year}</span>}
              {genres.map((g) => <span className="pill" key={g}>{g}</span>)}
            </div>
            {anime.description && <p className="title-desc">{anime.description}</p>}
          </div>
        </div>

        {anime.type === "movie" ? (
          movieVideo ? <div className="player-wrap"><Player videoUrl={movieVideo} /></div> : <div className="empty-state">Ссылка на фильм ещё не добавлена.</div>
        ) : seasons.length === 0 ? (
          <div className="empty-state">У этого сериала пока нет сезонов.</div>
        ) : (
          <>
            {seasons.length > 1 && <div className="season-tabs">{seasons.map((s) => <Link key={s.id} href={`/anime/${anime.slug}?season=${s.number}`} className={s.id === activeSeason?.id ? "active" : ""}>{s.title || `Сезон ${s.number}`}</Link>)}</div>}
            {activeEpisode ? (
              <>
                <div className="player-wrap"><Player videoUrl={activeEpisode.videoUrl} /></div>
                <div className="episode-list">
                  {activeSeason!.episodes.map((ep) => (
                    <Link key={ep.id} href={`/anime/${anime.slug}?season=${activeSeason!.number}&ep=${ep.number}`} className={`episode-row ${ep.id === activeEpisode.id ? "active" : ""}`}>
                      <span className="num">{String(ep.number).padStart(2, "0")}</span>
                      <span className="name">{ep.title || `Серия ${ep.number}`}</span>
                      {ep.duration && <span className="dur">{ep.duration} мин</span>}
                    </Link>
                  ))}
                </div>
              </>
            ) : <div className="empty-state">В этом сезоне пока нет серий.</div>}
          </>
        )}
      </div>
    </div>
  );
}

function Player({ videoUrl }: { videoUrl: string }) {
  const { type, src } = normalizeVideoUrl(videoUrl);
  if (type === "iframe") return <iframe src={src} title="player" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
  return <video src={src} controls playsInline preload="metadata">Ваш браузер не поддерживает видео.</video>;
}
